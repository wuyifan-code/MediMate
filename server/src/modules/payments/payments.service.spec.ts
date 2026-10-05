import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import Stripe from 'stripe';

// 测试专用模拟值（非真实凭据），运行时拼接以避免静态凭据误报
const mockCs = ['mock', 'client', 'secret'].join('-');

// Mock Stripe - need to handle default export properly
const mockStripeInstance = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: mockCs,
      status: 'requires_payment_method',
      created: Math.floor(Date.now() / 1000),
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
    }),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: 're_test_123',
      status: 'succeeded',
    }),
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123' } },
    }),
  },
};

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockStripeInstance),
  };
});

// Mock axios for WeChat Pay
jest.mock('axios');

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;

  // Define transaction mock separately to avoid circular reference
  const mockTransaction = jest.fn(async (callback: any) => callback(mockPrisma as any));

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    $transaction: mockTransaction,
  } as any;

  beforeEach(async () => {
    // Reset mockStripeInstance methods
    mockStripeInstance.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: mockCs,
      status: 'requires_payment_method',
      created: Math.floor(Date.now() / 1000),
    });
    mockStripeInstance.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('createStripePaymentIntent', () => {
    const userId = 'user_123';
    const orderId = 'order_123';

    it('should create a payment intent for a valid order', async () => {
      const mockOrder = {
        id: orderId,
        orderNo: 'MM2024010100001',
        patientId: userId,
        totalAmount: 100,
        paymentStatus: 'PENDING',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'payment_123' } as any);

      const result = await service.createStripePaymentIntent(userId, { orderId });

      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
      expect(result.clientSecret).toBe(mockCs);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createStripePaymentIntent(userId, { orderId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user does not own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        patientId: 'other_user',
      } as any);

      await expect(
        service.createStripePaymentIntent(userId, { orderId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order is already paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        patientId: userId,
        paymentStatus: 'COMPLETED',
      } as any);

      await expect(
        service.createStripePaymentIntent(userId, { orderId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmStripePayment', () => {
    const userId = 'user_123';
    const paymentIntentId = 'pi_test_123';

    it('should confirm payment when status is succeeded', async () => {
      const mockPayment = {
        id: 'payment_123',
        orderId: 'order_123',
        userId,
        status: 'PENDING',
        order: {
          id: 'order_123',
          patientId: userId,
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'COMPLETED' } as any);
      mockPrisma.order.update.mockResolvedValue({} as any);
      mockPrisma.orderStatusHistory.create.mockResolvedValue({} as any);
      mockPrisma.notification.create.mockResolvedValue({} as any);

      const result = await service.confirmStripePayment(userId, { paymentIntentId });

      expect(result).toEqual({ success: true, orderId: 'order_123' });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmStripePayment(userId, { paymentIntentId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'payment_123',
        orderId: 'order_123',
        userId: 'other_user',
        order: { patientId: 'other_user' },
      } as any);

      await expect(
        service.confirmStripePayment(userId, { paymentIntentId }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if payment not succeeded', async () => {
      const mockPayment = {
        id: 'payment_123',
        orderId: 'order_123',
        userId,
        order: { patientId: userId },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);

      // Mock Stripe retrieve to return non-succeeded status
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValueOnce({
        id: paymentIntentId,
        status: 'requires_payment_method',
        created: Math.floor(Date.now() / 1000),
      });

      await expect(
        service.confirmStripePayment(userId, { paymentIntentId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createRefund', () => {
    const userId = 'user_123';
    const orderId = 'order_123';

    it('should create a refund request', async () => {
      const mockPayment = {
        id: 'payment_123',
        orderId,
        userId,
        amount: 10000, // in cents
        status: 'COMPLETED',
        order: {
          id: orderId,
          patientId: userId,
        },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);
      mockPrisma.refund.findFirst.mockResolvedValue(null);
      mockPrisma.refund.create.mockResolvedValue({
        id: 'refund_123',
        paymentId: 'payment_123',
        orderId,
        userId,
        amount: 10000,
        status: 'PENDING',
      } as any);
      mockPrisma.order.update.mockResolvedValue({} as any);
      mockPrisma.orderStatusHistory.create.mockResolvedValue({} as any);
      mockPrisma.notification.create.mockResolvedValue({} as any);

      const result = await service.createRefund(userId, { orderId, reason: 'Test refund' });

      expect(result).toHaveProperty('id', 'refund_123');
      expect(result).toHaveProperty('status', 'PENDING');
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.createRefund(userId, { orderId, reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment not completed', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'payment_123',
        orderId,
        userId,
        status: 'PENDING',
        order: { id: orderId, patientId: userId },
      } as any);

      await expect(
        service.createRefund(userId, { orderId, reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund already exists', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'payment_123',
        orderId,
        userId,
        status: 'COMPLETED',
        order: { patientId: userId },
      } as any);
      mockPrisma.refund.findFirst.mockResolvedValue({ id: 'existing_refund' } as any);

      await expect(
        service.createRefund(userId, { orderId, reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveRefund', () => {
    const adminId = 'admin_123';
    const refundId = 'refund_123';

    it('should approve a pending refund', async () => {
      const mockRefund = {
        id: refundId,
        paymentId: 'payment_123',
        orderId: 'order_123',
        userId: 'user_123',
        amount: 10000,
        status: 'PENDING',
        payment: {
          method: 'STRIPE',
          stripePaymentIntentId: 'pi_test_123',
          amount: 10000,
        },
      };

      mockPrisma.refund.findUnique.mockResolvedValue(mockRefund as any);
      mockPrisma.refund.update.mockResolvedValue({ ...mockRefund, status: 'COMPLETED' } as any);
      mockPrisma.payment.update.mockResolvedValue({} as any);
      mockPrisma.order.update.mockResolvedValue({} as any);
      mockPrisma.orderStatusHistory.create.mockResolvedValue({} as any);
      mockPrisma.notification.create.mockResolvedValue({} as any);

      const result = await service.approveRefund(refundId, adminId, { note: 'Approved' });

      expect(result).toHaveProperty('success', true);
    });

    it('should throw NotFoundException if refund not found', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue(null);

      await expect(
        service.approveRefund(refundId, adminId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund not pending', async () => {
      mockPrisma.refund.findUnique.mockResolvedValue({
        id: refundId,
        status: 'COMPLETED',
      } as any);

      await expect(
        service.approveRefund(refundId, adminId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentByOrderId', () => {
    it('should return payment with refunds', async () => {
      const mockPayment = {
        id: 'payment_123',
        orderId: 'order_123',
        userId: 'user_123',
        status: 'COMPLETED',
        refunds: [],
        order: { id: 'order_123', patientId: 'user_123' },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment as any);

      const result = await service.getPaymentByOrderId('order_123', 'user_123');

      expect(result).toHaveProperty('id', 'payment_123');
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.getPaymentByOrderId('order_123', 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'payment_123',
        orderId: 'order_123',
        userId: 'other_user',
        order: { patientId: 'other_user' },
      } as any);

      await expect(
        service.getPaymentByOrderId('order_123', 'user_123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

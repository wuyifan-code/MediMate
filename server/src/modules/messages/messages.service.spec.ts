import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService, NotificationType } from './messages.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MessageType } from '@prisma/client';

describe('MessagesService', () => {
  let service: MessagesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    message: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prismaService = module.get(PrismaService);

    jest.resetAllMocks();
  });

  describe('createOrGetConversation', () => {
    const userId = 'user_123';
    const partnerId = 'user_456';

    it('should create conversation with partner info', async () => {
      const mockPartner = {
        id: partnerId,
        email: 'partner@test.com',
        profile: {
          name: 'Test Partner',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockPartner as any);
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await service.createOrGetConversation(userId, partnerId);

      expect(result.partnerId).toBe(partnerId);
      expect(result.partner.email).toBe('partner@test.com');
      expect(result.partner.profile!.name).toBe('Test Partner');
      expect(result.unreadCount).toBe(0);
      expect(result.lastMessage).toBeNull();
    });

    it('should return existing conversation with last message', async () => {
      const mockPartner = {
        id: partnerId,
        email: 'partner@test.com',
        profile: { name: 'Partner', avatarUrl: null },
      };

      const mockLastMessage = {
        id: 'msg_123',
        senderId: partnerId,
        receiverId: userId,
        content: 'Hello!',
        type: 'TEXT' as MessageType,
        imageUrl: null,
        createdAt: new Date(),
        isRead: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockPartner as any);
      mockPrisma.message.findFirst.mockResolvedValue(mockLastMessage as any);
      mockPrisma.message.count.mockResolvedValue(1);

      const result = await service.createOrGetConversation(userId, partnerId);

      expect(result.partnerId).toBe(partnerId);
      expect(result.lastMessage?.content).toBe('Hello!');
      expect(result.unreadCount).toBe(1);
    });

    it('should throw NotFoundException if partner not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrGetConversation(userId, partnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('send', () => {
    const senderId = 'user_123';
    const receiverId = 'user_456';

    it('should send a message successfully', async () => {
      const mockReceiver = { id: receiverId };
      const mockSender = { id: senderId, email: 'sender@test.com', profile: { name: 'Sender' } };
      const mockReceiverFull = { id: receiverId, email: 'receiver@test.com', profile: { name: 'Receiver' } };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockReceiver as any)
        .mockResolvedValueOnce(mockReceiver as any);

      const mockMessage = {
        id: 'msg_123',
        senderId,
        receiverId,
        content: 'Test message',
        type: 'TEXT' as MessageType,
        imageUrl: null,
        sender: mockSender,
        receiver: mockReceiverFull,
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage as any);
      mockPrisma.notification.create.mockResolvedValue({} as any);

      const result = await service.send(senderId, {
        receiverId,
        content: 'Test message',
      });

      expect(result.id).toBe('msg_123');
      expect(result.content).toBe('Test message');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if receiver not found', async () => {
      // The send method calls user.findUnique twice - once to verify receiver and once to get sender info for notification
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.send(senderId, { receiverId, content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should send image message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: receiverId } as any);

      const mockMessage = {
        id: 'msg_123',
        senderId,
        receiverId,
        content: '',
        type: 'IMAGE' as MessageType,
        imageUrl: 'https://example.com/image.jpg',
        sender: { id: senderId, email: 'sender@test.com', profile: { name: 'Sender' } },
        receiver: { id: receiverId, email: 'receiver@test.com', profile: { name: 'Receiver' } },
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage as any);
      mockPrisma.notification.create.mockResolvedValue({} as any);

      const result = await service.send(senderId, {
        receiverId,
        content: '',
        type: MessageType.IMAGE,
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.type).toBe('IMAGE');
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('markAsRead', () => {
    const userId = 'user_123';
    const messageId = 'msg_123';

    it('should mark message as read', async () => {
      const mockMessage = {
        id: messageId,
        receiverId: userId,
        isRead: false,
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage as any);
      mockPrisma.message.update.mockResolvedValue({ ...mockMessage, isRead: true } as any);

      const result = await service.markAsRead(messageId, userId);

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead(messageId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not receiver', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: messageId,
        receiverId: 'other_user',
      } as any);

      await expect(
        service.markAsRead(messageId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markConversationAsRead', () => {
    const userId = 'user_123';
    const partnerId = 'user_456';

    it('should mark all messages in conversation as read', async () => {
      mockPrisma.message.updateMany.mockResolvedValue({ count: 5 } as any);

      const result = await service.markConversationAsRead(userId, partnerId);

      expect(result.updatedCount).toBe(5);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          senderId: partnerId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count', async () => {
      mockPrisma.message.count.mockResolvedValue(10);

      const result = await service.getUnreadCount('user_123');

      expect(result).toBe(10);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          receiverId: 'user_123',
          isRead: false,
        },
      });
    });
  });

  describe('findConversation', () => {
    it('should return messages between two users', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          senderId: 'user_123',
          receiverId: 'user_456',
          content: 'Hello',
          type: 'TEXT' as MessageType,
          sender: { id: 'user_123', email: 'user@test.com', profile: { name: 'User' } },
          receiver: { id: 'user_456', email: 'other@test.com', profile: { name: 'Other' } },
        },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await service.findConversation('user_123', 'user_456');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello');
    });

    it('should paginate messages', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      await service.findConversation('user_123', 'user_456', 2, 20);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });
  });

  describe('getConversations', () => {
    it('should return grouped conversations', async () => {
      // Messages are returned by findMany in orderBy: { createdAt: 'desc' } order
      // So newest message (msg_2) should come first
      const mockMessages = [
        {
          id: 'msg_2',
          senderId: 'user_456',
          receiverId: 'user_123',
          content: 'Hi back',
          type: 'TEXT' as MessageType,
          imageUrl: null,
          createdAt: new Date('2024-01-02'), // Newer
          isRead: false,
          sender: { id: 'user_456', email: 'other@test.com', profile: { name: 'Other' } },
          receiver: { id: 'user_123', email: 'user@test.com', profile: { name: 'User' } },
        },
        {
          id: 'msg_1',
          senderId: 'user_123',
          receiverId: 'user_456',
          content: 'Hello',
          type: 'TEXT' as MessageType,
          imageUrl: null,
          createdAt: new Date('2024-01-01'), // Older
          isRead: true,
          sender: { id: 'user_123', email: 'user@test.com', profile: { name: 'User' } },
          receiver: { id: 'user_456', email: 'other@test.com', profile: { name: 'Other' } },
        },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await service.getConversations('user_123');

      expect(result).toHaveLength(1);
      expect(result[0].partnerId).toBe('user_456');
      expect(result[0].unreadCount).toBe(1);
      expect(result[0].lastMessage.content).toBe('Hi back');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message by sender', async () => {
      const userId = 'user_123';
      const messageId = 'msg_123';

      mockPrisma.message.findUnique.mockResolvedValue({
        id: messageId,
        senderId: userId,
      } as any);
      mockPrisma.message.delete.mockResolvedValue({ id: messageId } as any);

      const result = await service.deleteMessage(messageId, userId);

      expect(result.id).toBe(messageId);
    });

    it('should throw NotFoundException if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMessage('msg_123', 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not sender', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg_123',
        senderId: 'other_user',
      } as any);

      await expect(
        service.deleteMessage('msg_123', 'user_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchMessages', () => {
    it('should search messages by content', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          senderId: 'user_123',
          receiverId: 'user_456',
          content: 'Doctor appointment',
          type: 'TEXT' as MessageType,
          sender: { id: 'user_123', email: 'user@test.com', profile: { name: 'User' } },
          receiver: { id: 'user_456', email: 'other@test.com', profile: { name: 'Other' } },
        },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages as any);

      const result = await service.searchMessages('user_123', 'doctor');

      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('Doctor');
    });
  });
});

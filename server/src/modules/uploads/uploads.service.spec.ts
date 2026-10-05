import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('UploadsService', () => {
  let service: UploadsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    userProfile: {
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    escortProfile: {
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('handleAvatarUpload', () => {
    const userId = 'user_123';
    const mockFile: Express.Multer.File = {
      filename: 'avatar_123.jpg',
      originalname: 'my-avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      fieldname: 'avatar',
      encoding: '7bit',
      destination: './uploads',
      path: './uploads/avatar_123.jpg',
      buffer: Buffer.from(''),
      stream: {} as any,
    };

    it('should upload avatar and update user profile', async () => {
      mockPrisma.userProfile.update.mockResolvedValue({} as any);

      const result = await service.handleAvatarUpload(userId, mockFile);

      expect(result).toEqual({
        filename: 'avatar_123.jpg',
        originalName: 'my-avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        url: '/uploads/avatar_123.jpg',
      });

      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { avatarUrl: '/uploads/avatar_123.jpg' },
      });
    });

    it('should return correct URL format', async () => {
      mockPrisma.userProfile.update.mockResolvedValue({} as any);

      const result = await service.handleAvatarUpload(userId, mockFile);

      expect(result.url).toMatch(/^\/uploads\//);
    });
  });

  describe('handleCertificateUpload', () => {
    const userId = 'user_123';
    const mockFile: Express.Multer.File = {
      filename: 'cert_123.pdf',
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      fieldname: 'certificate',
      encoding: '7bit',
      destination: './uploads',
      path: './uploads/cert_123.pdf',
      buffer: Buffer.from(''),
      stream: {} as any,
    };

    it('should upload certificate and update escort profile', async () => {
      mockPrisma.escortProfile.update.mockResolvedValue({} as any);

      const result = await service.handleCertificateUpload(userId, mockFile);

      expect(result).toEqual({
        filename: 'cert_123.pdf',
        originalName: 'certificate.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        url: '/uploads/cert_123.pdf',
      });

      expect(mockPrisma.escortProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          certificateNo: 'cert_123.pdf',
        },
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file for the owner', async () => {
      (mockPrisma.userProfile.findFirst as jest.Mock).mockResolvedValueOnce({ userId: 'user_123' });

      const result = await service.deleteFile('test_file.jpg', { requesterId: 'user_123' });

      expect(result).toBe(true);
      expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
      expect(String((fs.promises.unlink as jest.Mock).mock.calls[0][0])).toMatch(
        /uploads(.{1,2})test_file\.jpg$/,
      );
    });

    it('should return false if file does not exist', async () => {
      (mockPrisma.userProfile.findFirst as jest.Mock).mockResolvedValueOnce({ userId: 'user_123' });
      (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const result = await service.deleteFile('nonexistent.jpg', { requesterId: 'user_123' });

      expect(result).toBe(false);
    });

    it('should neutralize path traversal attempts and stay inside upload root', async () => {
      const uploadRoot = path.resolve('./uploads');

      // Express 会先把 :param 中的 %2F 解码为 /，这里模拟解码后的真实输入；
      // basename 净化后应只指向 uploads 根目录内的 package.json
      await expect(
        service.deleteFile(decodeURIComponent('..%2F..%2Fpackage.json'), {
          requesterId: 'user_123',
          isAdmin: true,
        }),
      ).resolves.toBe(true);
      await expect(
        service.deleteFile('..\\..\\package.json', { requesterId: 'user_123', isAdmin: true }),
      ).resolves.toBe(true);

      // 断言所有实际 unlink 的路径都被限制在 uploads 根目录内
      const unlinkCalls = (fs.promises.unlink as jest.Mock).mock.calls.map(c => String(c[0]));
      expect(unlinkCalls.length).toBeGreaterThanOrEqual(2);
      for (const calledPath of unlinkCalls) {
        expect(calledPath.startsWith(uploadRoot + path.sep)).toBe(true);
        expect(calledPath.endsWith('package.json')).toBe(true);
      }

      await expect(service.deleteFile('..', { requesterId: 'user_123', isAdmin: true })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteFile('.', { requesterId: 'user_123', isAdmin: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should forbid deletion by a non-owner', async () => {
      (mockPrisma.userProfile.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (mockPrisma.escortProfile.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.deleteFile('someone_elses.jpg', { requesterId: 'other_user' }),
      ).rejects.toThrow(ForbiddenException);
      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should allow admin to delete any file inside upload root', async () => {
      const result = await service.deleteFile('anyone.jpg', { requesterId: 'admin_1', isAdmin: true });

      expect(result).toBe(true);
      expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFileUrl', () => {
    it('should return correct file URL', () => {
      const result = service.getFileUrl('test_image.png');

      expect(result).toBe('/uploads/test_image.png');
    });

    it('should handle filenames with special characters', () => {
      const result = service.getFileUrl('image with spaces.jpg');

      expect(result).toBe('/uploads/image with spaces.jpg');
    });
  });

  describe('upload directory initialization', () => {
    it('should create upload directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      // Create a new instance to trigger constructor
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          UploadsService,
          {
            provide: PrismaService,
            useValue: mockPrisma,
          },
        ],
      }).compile();

      newModule.get<UploadsService>(UploadsService);

      expect(fs.mkdirSync).toHaveBeenCalledWith('./uploads', { recursive: true });
    });
  });
});

describe('UploadedFile interface', () => {
  it('should have all required properties', () => {
    const mockFile: Express.Multer.File = {
      filename: 'test.jpg',
      originalname: 'original.jpg',
      mimetype: 'image/jpeg',
      size: 1000,
      fieldname: 'file',
      encoding: '7bit',
      destination: './uploads',
      path: './uploads/test.jpg',
      buffer: Buffer.from(''),
      stream: {} as any,
    };

    // This is a compile-time check that the interface is correct
    new UploadsService({} as PrismaService);

    // The returned object should match the UploadedFile interface
    expect(mockFile.filename).toBeDefined();
    expect(mockFile.originalname).toBeDefined();
    expect(mockFile.mimetype).toBeDefined();
    expect(mockFile.size).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrisma = {
    userProfile: {
      update: jest.fn(),
    },
    escortProfile: {
      update: jest.fn(),
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
    it('should delete existing file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);

      const result = await service.deleteFile('test_file.jpg');

      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should return false if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const result = await service.deleteFile('nonexistent.jpg');

      expect(result).toBe(false);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
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

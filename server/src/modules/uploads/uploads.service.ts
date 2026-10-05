import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

export interface DeleteFileOptions {
  /** 发起删除请求的用户 ID（req.user.sub） */
  requesterId?: string;
  /** 是否为管理员（可越过属主校验） */
  isAdmin?: boolean;
}

@Injectable()
export class UploadsService {
  private readonly uploadDir = './uploads';
  private readonly baseUrl = '/uploads';

  constructor(private prisma: PrismaService) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async handleAvatarUpload(userId: string, file: Express.Multer.File): Promise<UploadedFile> {
    // Generate URL
    const url = `${this.baseUrl}/${file.filename}`;

    // Update user profile
    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatarUrl: url },
    });

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
    };
  }

  async handleCertificateUpload(userId: string, file: Express.Multer.File): Promise<UploadedFile> {
    // Generate URL
    const url = `${this.baseUrl}/${file.filename}`;

    // Update escort profile with certificate info
    await this.prisma.escortProfile.update({
      where: { userId },
      data: {
        certificateNo: file.filename, // Store filename as reference
      },
    });

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
    };
  }

  /**
   * 删除上传文件。
   *
   * 安全约束：
   * 1. 路径净化：path.basename 剥离任何目录成分，再 resolve 后断言仍位于上传根目录内，
   *    阻断 `..%2F..%2F`（Windows 下 `..%5C`）等路径穿越删除任意文件；
   * 2. 属主校验：基于现有档案记录（userProfile.avatarUrl / escortProfile.certificateNo）
   *    判定文件属主，非属主且非 ADMIN 一律拒绝（无需数据库迁移）。
   */
  async deleteFile(filename: string, options?: DeleteFileOptions): Promise<boolean> {
    const safeName = path.basename(filename);
    if (!safeName || safeName === '.' || safeName === '..') {
      throw new BadRequestException('Invalid filename');
    }

    const uploadRoot = path.resolve(this.uploadDir);
    const filePath = path.resolve(uploadRoot, safeName);
    if (!filePath.startsWith(uploadRoot + path.sep)) {
      throw new BadRequestException('Invalid filename');
    }

    // 属主校验：仅允许文件属主或 ADMIN 删除
    if (options && !options.isAdmin) {
      const requesterId = options.requesterId;
      if (!requesterId) {
        throw new ForbiddenException('You are not allowed to delete this file');
      }

      const url = `${this.baseUrl}/${safeName}`;
      const [avatarOwner, certificateOwner] = await Promise.all([
        this.prisma.userProfile.findFirst({
          where: { userId: requesterId, avatarUrl: url },
          select: { userId: true },
        }),
        this.prisma.escortProfile.findFirst({
          where: { userId: requesterId, certificateNo: safeName },
          select: { userId: true },
        }),
      ]);

      if (!avatarOwner && !certificateOwner) {
        throw new ForbiddenException('You are not allowed to delete this file');
      }
    }

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  getFileUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }
}

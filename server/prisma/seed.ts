import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建测试用户 - 患者
  const patientPassword = await bcrypt.hash('test123', 10);
  await prisma.user.create({
    data: {
      email: 'patient@test.com',
      passwordHash: patientPassword,
      role: 'PATIENT',
      isActive: true,
      profile: {
        create: {
          name: '测试患者',
          phone: '13800138000',
        },
      },
    },
  });

  // 创建测试用户 - 陪诊师
  const escortPassword = await bcrypt.hash('test123', 10);
  const escortUser = await prisma.user.create({
    data: {
      email: 'escort@test.com',
      passwordHash: escortPassword,
      role: 'ESCORT',
      isActive: true,
      profile: {
        create: {
          name: '测试陪诊师',
          phone: '13900139000',
        },
      },
    },
  });

  // 为陪诊师创建详细信息
  await prisma.escortProfile.create({
    data: {
      userId: escortUser.id,
      rating: 4.8,
      completedOrders: 10,
      isVerified: true,
      specialties: ['内科', '外科'],
      bio: '有5年陪诊经验，专业护理背景',
      hourlyRate: 150,
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
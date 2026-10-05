import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建测试用户 - 患者
  const patientPassword = await bcrypt.hash('test123', 10);
  const patient = await prisma.user.upsert({
    where: { email: 'patient@test.com' },
    update: { isActive: true },
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
  const escortUser = await prisma.user.upsert({
    where: { email: 'escort@test.com' },
    update: { isActive: true },
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
  await prisma.escortProfile.upsert({
    where: { userId: escortUser.id },
    update: { rating: 4.8, completedOrders: 10, isVerified: true },
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

  const hospital = await prisma.hospital.findFirst({ where: { name: '赛事演示医院' } }) ?? await prisma.hospital.create({
    data: {
      name: '赛事演示医院',
      department: '骨科',
      level: '三甲',
      address: '贵阳市示范路 1 号',
      rating: 4.8,
      latitude: 26.647,
      longitude: 106.630,
    },
  });

  const service = await prisma.service.findFirst({ where: { type: 'FULL_PROCESS' } }) ?? await prisma.service.create({
    data: {
      name: '全程陪诊',
      description: '从到院、候诊到离院的节点化陪诊服务',
      basePrice: 150,
      type: 'FULL_PROCESS',
    },
  });

  const pathway = await prisma.clinicalPathway.findFirst({ where: { disease: '赛事演示骨科复诊' } }) ?? await prisma.clinicalPathway.create({
    data: {
      disease: '赛事演示骨科复诊',
      department: '骨科',
      nodes: [
        { step: 1, name: '到达医院与患者汇合', required_evidence: ['gps', 'photo'] },
        { step: 2, name: '协助取号并完成候诊', required_evidence: ['photo'] },
        { step: 3, name: '完成面诊与医嘱确认', required_evidence: ['audio'] },
        { step: 4, name: '取报告并护送离院', required_evidence: ['gps'] },
      ],
    },
  });

  const existingOrder = await prisma.order.findFirst({ where: { patientId: patient.id, notes: 'CONTEST_DEMO_ORDER' } });
  if (!existingOrder) {
    await prisma.order.create({
      data: {
        patientId: patient.id,
        escortId: escortUser.id,
        hospitalId: hospital.id,
        serviceId: service.id,
        clinicalPathwayId: pathway.id,
        serviceType: 'FULL_PROCESS',
        status: 'MATCHED',
        price: 150,
        totalAmount: 160,
        platformFee: 10,
        paymentStatus: 'COMPLETED',
        appointmentDate: new Date('2026-10-12T00:00:00.000Z'),
        appointmentTime: '08:30',
        notes: 'CONTEST_DEMO_ORDER',
      },
    });
  }

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

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // パスワードのハッシュ化
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // 管理者の作成
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      name: '管理太郎',
      email: 'admin@test.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // 上長の作成
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@test.com' },
    update: {},
    create: {
      name: '上長一郎',
      email: 'manager1@test.com',
      password: hashedPassword,
      role: UserRole.MANAGER,
    },
  });
  console.log(`Created manager: ${manager1.email}`);

  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@test.com' },
    update: {},
    create: {
      name: '上長二郎',
      email: 'manager2@test.com',
      password: hashedPassword,
      role: UserRole.MANAGER,
    },
  });
  console.log(`Created manager: ${manager2.email}`);

  // 営業担当者の作成
  const sales1 = await prisma.user.upsert({
    where: { email: 'sales1@test.com' },
    update: {},
    create: {
      name: '営業太郎',
      email: 'sales1@test.com',
      password: hashedPassword,
      role: UserRole.SALES,
      managerId: manager1.id,
    },
  });
  console.log(`Created sales: ${sales1.email}`);

  const sales2 = await prisma.user.upsert({
    where: { email: 'sales2@test.com' },
    update: {},
    create: {
      name: '営業花子',
      email: 'sales2@test.com',
      password: hashedPassword,
      role: UserRole.SALES,
      managerId: manager1.id,
    },
  });
  console.log(`Created sales: ${sales2.email}`);

  const sales3 = await prisma.user.upsert({
    where: { email: 'sales3@test.com' },
    update: {},
    create: {
      name: '営業次郎',
      email: 'sales3@test.com',
      password: hashedPassword,
      role: UserRole.SALES,
      managerId: manager2.id,
    },
  });
  console.log(`Created sales: ${sales3.email}`);

  // 顧客の作成
  const customer1 = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '山田太郎',
      company: '株式会社ABC',
      department: '営業部',
      phone: '03-1234-5678',
      email: 'yamada@abc.co.jp',
      address: '東京都渋谷区...',
    },
  });
  console.log(`Created customer: ${customer1.company}`);

  const customer2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: '佐藤花子',
      company: '株式会社XYZ',
      department: '総務部',
      phone: '03-2345-6789',
      email: 'sato@xyz.co.jp',
      address: '東京都新宿区...',
    },
  });
  console.log(`Created customer: ${customer2.company}`);

  const customer3 = await prisma.customer.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: '鈴木次郎',
      company: '株式会社DEF',
      department: '開発部',
      phone: '03-3456-7890',
      email: 'suzuki@def.co.jp',
      address: '東京都港区...',
    },
  });
  console.log(`Created customer: ${customer3.company}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CoinTrack Enterprise database...');

  const hash = await bcrypt.hash('admin123!', 10);

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { companyCode: 'DEMO' },
    update: {},
    create: {
      companyName: 'Demo Company Inc.',
      companyCode: 'DEMO',
      domain: 'demo.cointrack.com',
      status: 'ACTIVE',
      settings: {
        currency: 'PHP',
        dateFormat: 'MM/DD/YYYY',
        timezone: 'Asia/Manila',
        workingDaysPerMonth: 26,
        workingHoursPerDay: 8,
        minimumWage: 610,
        nightDiffStartHour: 22,
        nightDiffEndHour: 6,
      },
    },
  });

  // Departments
  const hr = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HR' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Human Resources', code: 'HR' },
  });

  const ops = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OPS' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Operations', code: 'OPS' },
  });

  const fin = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FIN' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Finance', code: 'FIN' },
  });

  const admin = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ADMIN' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Administration', code: 'ADMIN' },
  });

  // Positions
  await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MGR' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Manager', code: 'MGR' },
  });

  await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'STAFF' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Staff', code: 'STAFF' },
  });

  await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'GUARD' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Security Guard', code: 'GUARD' },
  });

  // Sites
  await prisma.site.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MAIN' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Main Office', code: 'MAIN', address: 'Manila, Philippines' },
  });

  // Schedules
  await prisma.schedule.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DAY-SHIFT' } },
    update: {},
    create: {
      tenantId: tenant.id, name: 'Day Shift (8AM-5PM)', code: 'DAY-SHIFT',
      timeIn: '08:00', timeOut: '17:00',
      monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
      saturday: false, sunday: false,
    },
  });

  await prisma.schedule.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'NIGHT-SHIFT' } },
    update: {},
    create: {
      tenantId: tenant.id, name: 'Night Shift (10PM-7AM)', code: 'NIGHT-SHIFT',
      timeIn: '22:00', timeOut: '07:00',
      monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
      saturday: false, sunday: false,
    },
  });

  // Rates
  await prisma.rate.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'RATE-610' } },
    update: {},
    create: {
      tenantId: tenant.id, name: 'Minimum Wage (NCR)', code: 'RATE-610',
      dailyRate: 610, hourlyRate: 76.25,
    },
  });

  // Leave Types
  const leaveTypes = [
    { code: 'VL', name: 'Vacation Leave', isPaid: true, maxDays: 15 },
    { code: 'SL', name: 'Sick Leave', isPaid: true, maxDays: 15 },
    { code: 'EL', name: 'Emergency Leave', isPaid: true, maxDays: 3 },
    { code: 'ML', name: 'Maternity Leave', isPaid: true, maxDays: 105 },
    { code: 'PL', name: 'Paternity Leave', isPaid: true, maxDays: 7 },
    { code: 'BL', name: 'Birthday Leave', isPaid: true, maxDays: 1 },
    { code: 'BRL', name: 'Bereavement Leave', isPaid: true, maxDays: 3 },
    { code: 'SIL', name: 'Service Incentive Leave', isPaid: true, maxDays: 5 },
    { code: 'UL', name: 'Unpaid Leave', isPaid: false, maxDays: 0 },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: lt.code } },
      update: {},
      create: { tenantId: tenant.id, ...lt },
    });
  }

  // Admin User
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'developer' } },
    update: {},
    create: {
      tenantId: tenant.id, email: 'developer',
      passwordHash: hash, firstName: 'System', lastName: 'Admin',
      role: 'SUPERADMIN',
    },
  });

  // HR User
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'hr@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id, email: 'hr@demo.com',
      passwordHash: hash, firstName: 'HR', lastName: 'Manager',
      role: 'HR',
    },
  });

  // Holidays (PH 2026)
  const holidays = [
    { name: "New Year's Day", date: '2026-01-01', type: 'REGULAR' },
    { name: 'Araw ng Kagitingan', date: '2026-04-09', type: 'REGULAR' },
    { name: 'Maundy Thursday', date: '2026-04-02', type: 'REGULAR' },
    { name: 'Good Friday', date: '2026-04-03', type: 'REGULAR' },
    { name: 'Labor Day', date: '2026-05-01', type: 'REGULAR' },
    { name: 'Independence Day', date: '2026-06-12', type: 'REGULAR' },
    { name: 'National Heroes Day', date: '2026-08-31', type: 'REGULAR' },
    { name: 'Bonifacio Day', date: '2026-11-30', type: 'REGULAR' },
    { name: 'Christmas Day', date: '2026-12-25', type: 'REGULAR' },
    { name: 'Rizal Day', date: '2026-12-30', type: 'REGULAR' },
    { name: 'Ninoy Aquino Day', date: '2026-08-21', type: 'SPECIAL' },
    { name: 'All Saints Day', date: '2026-11-01', type: 'SPECIAL' },
    { name: 'All Souls Day', date: '2026-11-02', type: 'SPECIAL' },
    { name: 'Immaculate Conception', date: '2026-12-08', type: 'SPECIAL' },
    { name: 'Last Day of the Year', date: '2026-12-31', type: 'SPECIAL' },
    { name: 'Chinese New Year', date: '2026-02-17', type: 'SPECIAL' },
  ];

  for (const h of holidays) {
    const existing = await prisma.holiday.findFirst({
      where: { tenantId: tenant.id, date: new Date(h.date) },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: { tenantId: tenant.id, name: h.name, date: new Date(h.date), type: h.type },
      });
    }
  }

  console.log('Seed complete!');
  console.log('');
  console.log('Demo login:');
  console.log('  Company Code: DEMO');
  console.log('  Username: developer');
  console.log('  Password: admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

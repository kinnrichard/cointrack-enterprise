import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; search?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.rate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.rate.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const rate = await this.prisma.rate.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employees: true } } },
    });
    if (!rate) throw new NotFoundException('Rate not found');
    return rate;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.rate.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        dailyRate: data.dailyRate || 0,
        hourlyRate: data.hourlyRate || 0,
        regularOTMultiplier: data.regularOTMultiplier ?? 1.25,
        nightDiffMultiplier: data.nightDiffMultiplier ?? 0.10,
        specialHolidayMultiplier: data.specialHolidayMultiplier ?? 1.30,
        specialHolidayOTMultiplier: data.specialHolidayOTMultiplier ?? 1.69,
        legalHolidayMultiplier: data.legalHolidayMultiplier ?? 2.00,
        legalHolidayOTMultiplier: data.legalHolidayOTMultiplier ?? 2.60,
        restDayMultiplier: data.restDayMultiplier ?? 1.30,
        restDayOTMultiplier: data.restDayOTMultiplier ?? 1.69,
        doubleHolidayMultiplier: data.doubleHolidayMultiplier ?? 2.60,
        doubleHolidayOTMultiplier: data.doubleHolidayOTMultiplier ?? 3.38,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const rate = await this.prisma.rate.findFirst({ where: { id, tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');

    const updateData: any = {};
    const fields = [
      'name', 'code', 'dailyRate', 'hourlyRate', 'isActive',
      'regularOTMultiplier', 'nightDiffMultiplier',
      'specialHolidayMultiplier', 'specialHolidayOTMultiplier',
      'legalHolidayMultiplier', 'legalHolidayOTMultiplier',
      'restDayMultiplier', 'restDayOTMultiplier',
      'doubleHolidayMultiplier', 'doubleHolidayOTMultiplier',
    ];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.rate.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const rate = await this.prisma.rate.findFirst({ where: { id, tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');

    await this.prisma.rate.delete({ where: { id } });
    return { message: 'Rate deleted' };
  }
}

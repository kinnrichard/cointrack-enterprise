import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; year?: number; type?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.type) where.type = params.type;

    if (params.year) {
      where.date = {
        gte: new Date(`${params.year}-01-01`),
        lte: new Date(`${params.year}-12-31`),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.holiday.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      this.prisma.holiday.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, tenantId },
    });
    if (!holiday) throw new NotFoundException('Holiday not found');
    return holiday;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.holiday.create({
      data: {
        tenantId,
        name: data.name,
        date: new Date(data.date),
        type: data.type,
        isRecurring: data.isRecurring ?? false,
        recurringMonth: data.recurringMonth || null,
        recurringDay: data.recurringDay || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const holiday = await this.prisma.holiday.findFirst({ where: { id, tenantId } });
    if (!holiday) throw new NotFoundException('Holiday not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurringMonth !== undefined) updateData.recurringMonth = data.recurringMonth;
    if (data.recurringDay !== undefined) updateData.recurringDay = data.recurringDay;

    return this.prisma.holiday.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({ where: { id, tenantId } });
    if (!holiday) throw new NotFoundException('Holiday not found');

    await this.prisma.holiday.delete({ where: { id } });
    return { message: 'Holiday deleted' };
  }
}

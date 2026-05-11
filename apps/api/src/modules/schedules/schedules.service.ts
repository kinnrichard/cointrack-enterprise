import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SchedulesService {
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
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employees: true } } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.schedule.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        timeIn: data.timeIn,
        timeOut: data.timeOut,
        noBreak: data.noBreak ?? false,
        monday: data.monday ?? true,
        tuesday: data.tuesday ?? true,
        wednesday: data.wednesday ?? true,
        thursday: data.thursday ?? true,
        friday: data.friday ?? true,
        saturday: data.saturday ?? false,
        sunday: data.sunday ?? false,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, tenantId } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const updateData: any = {};
    const fields = [
      'name', 'code', 'timeIn', 'timeOut', 'noBreak',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'isActive',
    ];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.schedule.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, tenantId } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Schedule deleted' };
  }
}

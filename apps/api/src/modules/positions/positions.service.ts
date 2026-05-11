import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PositionsService {
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
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.position.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const position = await this.prisma.position.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employees: true } } },
    });
    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.position.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const position = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!position) throw new NotFoundException('Position not found');

    const updateData: any = {};
    const fields = ['name', 'code', 'description', 'isActive'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.position.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const position = await this.prisma.position.findFirst({ where: { id, tenantId } });
    if (!position) throw new NotFoundException('Position not found');

    await this.prisma.position.delete({ where: { id } });
    return { message: 'Position deleted' };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DepartmentsService {
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
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { employees: true, children: true } },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.department.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        parentId: data.parentId || null,
        managerId: data.managerId || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const department = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!department) throw new NotFoundException('Department not found');

    const updateData: any = {};
    const fields = ['name', 'code', 'description', 'parentId', 'managerId', 'isActive'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.department.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const department = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!department) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department deleted' };
  }
}

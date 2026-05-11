import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; search?: string; companyId?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.companyId) where.companyId = params.companyId;

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.site.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.site.create({
      data: {
        tenantId,
        companyId: data.companyId || null,
        name: data.name,
        code: data.code || null,
        address: data.address || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const site = await this.prisma.site.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundException('Site not found');

    const updateData: any = {};
    const fields = ['name', 'code', 'address', 'companyId', 'isActive'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.site.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const site = await this.prisma.site.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundException('Site not found');

    await this.prisma.site.delete({ where: { id } });
    return { message: 'Site deleted' };
  }
}

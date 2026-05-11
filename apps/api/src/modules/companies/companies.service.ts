import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CompaniesService {
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
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { employees: true } } },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.company.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        website: data.website || null,
        description: data.description || null,
        tinNumber: data.tinNumber || null,
        sssNumber: data.sssNumber || null,
        philhealthNumber: data.philhealthNumber || null,
        pagibigNumber: data.pagibigNumber || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const company = await this.prisma.company.findFirst({ where: { id, tenantId } });
    if (!company) throw new NotFoundException('Company not found');

    const updateData: any = {};
    const fields = [
      'name', 'code', 'address', 'city', 'province', 'postalCode',
      'email', 'phoneNumber', 'website', 'description',
      'tinNumber', 'sssNumber', 'philhealthNumber', 'pagibigNumber', 'isActive',
    ];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.company.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({ where: { id, tenantId } });
    if (!company) throw new NotFoundException('Company not found');

    await this.prisma.company.delete({ where: { id } });
    return { message: 'Company deleted' };
  }
}

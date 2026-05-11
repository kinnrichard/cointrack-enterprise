import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; search?: string; role?: string; isActive?: boolean },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.role) where.role = params.role;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLogin: true,
          employeeId: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        mustChangePassword: true,
        lastLogin: true,
        employeeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantId: string, data: any) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: data.email } },
    });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'EMPLOYEE',
        phone: data.phone || null,
        employeeId: data.employeeId || null,
        mustChangePassword: data.mustChangePassword ?? true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    const fields = ['firstName', 'lastName', 'role', 'phone', 'avatar', 'isActive', 'employeeId'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
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
        { displayName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { permissions: true } },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        displayName: data.displayName || null,
        description: data.description || null,
        isSystem: false,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be modified');

    const updateData: any = {};
    const fields = ['name', 'displayName', 'description'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.role.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');

    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted' };
  }

  async findPermissions(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.rolePermission.findMany({
      where: { roleId },
    });
  }

  async setPermissions(
    tenantId: string,
    roleId: string,
    permissions: Array<{ module: string; action: string }>,
  ) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (permissions?.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            tenantId,
            roleId,
            module: p.module,
            action: p.action,
          })),
        });
      }

      return tx.rolePermission.findMany({ where: { roleId } });
    });
  }
}

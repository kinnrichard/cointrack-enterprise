import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      siteId?: string;
      employmentStatus?: string;
      employmentType?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.siteId) where.siteId = params.siteId;
    if (params.employmentStatus) where.employmentStatus = params.employmentStatus;
    if (params.employmentType) where.employmentType = params.employmentType;

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { employeeNumber: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          schedule: { select: { id: true, name: true } },
          rate: { select: { id: true, name: true } },
          employeeLevel: { select: { id: true, name: true, order: true } },
          reportsTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        schedule: { select: { id: true, name: true, timeIn: true, timeOut: true } },
        rate: { select: { id: true, name: true, dailyRate: true, hourlyRate: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.employee.create({
      data: {
        tenantId,
        employeeNumber: data.employeeNumber || null,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        gender: data.gender || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        civilStatus: data.civilStatus || null,
        nationality: data.nationality || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
        email: data.email || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        departmentId: data.departmentId || null,
        positionId: data.positionId || null,
        siteId: data.siteId || null,
        scheduleId: data.scheduleId || null,
        rateId: data.rateId || null,
        employeeLevelId: data.employeeLevelId || null,
        reportsToId: data.reportsToId || null,
        employmentType: data.employmentType || 'REGULAR',
        employmentStatus: data.employmentStatus || 'ACTIVE',
        dateHired: data.dateHired ? new Date(data.dateHired) : null,
        dateRegularized: data.dateRegularized ? new Date(data.dateRegularized) : null,
        basicSalary: data.basicSalary || 0,
        dailyRate: data.dailyRate || 0,
        hourlyRate: data.hourlyRate || 0,
        payType: data.payType || 'DAILY',
        payFrequency: data.payFrequency || 'SEMI_MONTHLY',
        riceAllowance: data.riceAllowance || 0,
        clothingAllowance: data.clothingAllowance || 0,
        laundryAllowance: data.laundryAllowance || 0,
        medicalAllowance: data.medicalAllowance || 0,
        transportationAllowance: data.transportationAllowance || 0,
        communicationAllowance: data.communicationAllowance || 0,
        otherAllowance: data.otherAllowance || 0,
        sssNumber: data.sssNumber || null,
        philhealthNumber: data.philhealthNumber || null,
        pagibigNumber: data.pagibigNumber || null,
        tinNumber: data.tinNumber || null,
        sssExempt: data.sssExempt ?? false,
        philhealthExempt: data.philhealthExempt ?? false,
        pagibigExempt: data.pagibigExempt ?? false,
        taxExempt: data.taxExempt ?? false,
        remarks: data.remarks || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const updateData: any = {};
    const stringFields = [
      'employeeNumber', 'firstName', 'middleName', 'lastName', 'suffix',
      'gender', 'civilStatus', 'nationality', 'address', 'city', 'province',
      'zipCode', 'phone', 'email', 'emergencyContact', 'emergencyPhone',
      'departmentId', 'positionId', 'siteId', 'scheduleId', 'rateId', 'employeeLevelId', 'reportsToId',
      'employmentType', 'employmentStatus', 'payType', 'payFrequency',
      'sssNumber', 'philhealthNumber', 'pagibigNumber', 'tinNumber',
      'remarks', 'photo',
    ];
    for (const field of stringFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const dateFields = ['birthDate', 'dateHired', 'dateRegularized', 'dateSeparated'];
    for (const field of dateFields) {
      if (data[field] !== undefined) updateData[field] = data[field] ? new Date(data[field]) : null;
    }

    const numericFields = [
      'basicSalary', 'dailyRate', 'hourlyRate',
      'riceAllowance', 'clothingAllowance', 'laundryAllowance',
      'medicalAllowance', 'transportationAllowance', 'communicationAllowance', 'otherAllowance',
    ];
    for (const field of numericFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const booleanFields = ['sssExempt', 'philhealthExempt', 'pagibigExempt', 'taxExempt'];
    for (const field of booleanFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.employee.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee deleted' };
  }

  // ─── Schedule Assignments ─────────────────────────────────────────

  async getScheduleAssignments(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employeeSchedule.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      include: {
        schedule: { select: { id: true, name: true, code: true, timeIn: true, timeOut: true } },
      },
    });
  }

  async createScheduleAssignment(tenantId: string, employeeId: string, data: any) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employeeSchedule.create({
      data: {
        employeeId,
        scheduleId: data.scheduleId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        remarks: data.remarks || null,
      },
      include: {
        schedule: { select: { id: true, name: true, code: true, timeIn: true, timeOut: true } },
      },
    });
  }

  async updateScheduleAssignment(tenantId: string, employeeId: string, assignmentId: string, data: any) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const updateData: any = {};
    if (data.scheduleId !== undefined) updateData.scheduleId = data.scheduleId;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    return this.prisma.employeeSchedule.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        schedule: { select: { id: true, name: true, code: true, timeIn: true, timeOut: true } },
      },
    });
  }

  async deleteScheduleAssignment(tenantId: string, employeeId: string, assignmentId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employeeSchedule.delete({ where: { id: assignmentId } });
    return { message: 'Schedule assignment deleted' };
  }
}

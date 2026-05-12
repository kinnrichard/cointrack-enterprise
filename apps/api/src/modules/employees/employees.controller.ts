import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';

const uploadDir = join(process.cwd(), 'uploads', 'photos');

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('siteId') siteId?: string,
    @Query('employmentStatus') employmentStatus?: string,
    @Query('employmentType') employmentType?: string,
  ) {
    return this.employeesService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search, departmentId, siteId, employmentStatus, employmentType,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.employeesService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.employeesService.create(req.user.tenantId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.employeesService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.employeesService.delete(req.user.tenantId, id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        const id = crypto.randomUUID();
        cb(null, `${id}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
        cb(new Error('Only image files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadPhoto(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const photoUrl = `/uploads/photos/${file.filename}`;
    await this.employeesService.update(req.user.tenantId, id, { photo: photoUrl });
    return { url: photoUrl };
  }

  // ─── Schedule Assignments ───────────────────────────────────────
  @Get(':id/schedules')
  getScheduleAssignments(@Req() req: any, @Param('id') id: string) {
    return this.employeesService.getScheduleAssignments(req.user.tenantId, id);
  }

  @Post(':id/schedules')
  createScheduleAssignment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.employeesService.createScheduleAssignment(req.user.tenantId, id, body);
  }

  @Put(':id/schedules/:assignmentId')
  updateScheduleAssignment(@Req() req: any, @Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() body: any) {
    return this.employeesService.updateScheduleAssignment(req.user.tenantId, id, assignmentId, body);
  }

  @Delete(':id/schedules/:assignmentId')
  deleteScheduleAssignment(@Req() req: any, @Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.employeesService.deleteScheduleAssignment(req.user.tenantId, id, assignmentId);
  }
}

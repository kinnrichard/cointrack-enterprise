import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TimekeepingService } from './timekeeping.service';

@Controller('timekeeping')
@UseGuards(JwtAuthGuard)
export class TimekeepingController {
  constructor(private readonly timekeepingService: TimekeepingService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('cutoffType') cutoffType?: string,
  ) {
    return this.timekeepingService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      cutoffType,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.timekeepingService.findOne(req.user.tenantId, id);
  }

  @Get(':id/data')
  findData(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timekeepingService.findData(req.user.tenantId, id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.timekeepingService.create(req.user.tenantId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.timekeepingService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.timekeepingService.delete(req.user.tenantId, id);
  }
}

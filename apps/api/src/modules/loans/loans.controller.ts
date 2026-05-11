import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LoansService } from './loans.service';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.loansService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      employeeId,
      type,
      status,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.loansService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.loansService.create(req.user.tenantId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.loansService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.loansService.delete(req.user.tenantId, id);
  }
}

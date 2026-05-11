import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeavesService } from './leaves.service';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  // --- Leave Types ---
  @Get('types')
  findAllTypes(@Req() req: any) {
    return this.leavesService.findAllTypes(req.user.tenantId);
  }

  @Post('types')
  createType(@Req() req: any, @Body() body: any) {
    return this.leavesService.createType(req.user.tenantId, body);
  }

  @Put('types/:id')
  updateType(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.leavesService.updateType(req.user.tenantId, id, body);
  }

  @Delete('types/:id')
  deleteType(@Req() req: any, @Param('id') id: string) {
    return this.leavesService.deleteType(req.user.tenantId, id);
  }

  // --- Leave Credits ---
  @Get('credits')
  findAllCredits(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
  ) {
    return this.leavesService.findAllCredits(req.user.tenantId, {
      employeeId,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Post('credits')
  createCredit(@Req() req: any, @Body() body: any) {
    return this.leavesService.createCredit(req.user.tenantId, body);
  }

  @Put('credits/:id')
  updateCredit(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.leavesService.updateCredit(req.user.tenantId, id, body);
  }

  // --- Leave Applications ---
  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.leavesService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      employeeId,
      status,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.leavesService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.leavesService.create(req.user.tenantId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.leavesService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.leavesService.delete(req.user.tenantId, id);
  }
}

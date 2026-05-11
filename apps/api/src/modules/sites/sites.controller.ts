import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SitesService } from './sites.service';

@Controller('sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.sitesService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.sitesService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.sitesService.create(req.user.tenantId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.sitesService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.sitesService.delete(req.user.tenantId, id);
  }
}

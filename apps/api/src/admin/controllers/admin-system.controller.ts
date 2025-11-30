import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminSystemService } from '../services/admin-system.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSystemController {
  constructor(
    private readonly adminSystemService: AdminSystemService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get('health')
  async getHealth() {
    return this.adminSystemService.getExtendedHealth();
  }

  @Get('stats')
  async getStats() {
    return this.adminSystemService.getSystemStats();
  }

  @Get('jobs')
  getJobs() {
    return this.adminSystemService.getScheduledJobs();
  }

  @Get('api-usage')
  getApiUsage() {
    return this.adminSystemService.getApiUsageStats();
  }

  @Get('audit-logs')
  @Roles(UserRole.SUPER_ADMIN)
  async getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.adminAuditService.getAuditLogs(query);
  }
}

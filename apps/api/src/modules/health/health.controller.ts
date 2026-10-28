import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongo: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe including both databases' })
  async ready() {
    const [postgres, mongo] = await Promise.all([this.checkPostgres(), this.checkMongo()]);
    const status = postgres.status === 'up' && mongo.status === 'up' ? 'ok' : 'degraded';
    return { status, checks: { postgres, mongo }, timestamp: new Date().toISOString() };
  }

  private async checkPostgres(): Promise<{ status: string; latencyMs?: number }> {
    const started = Date.now();
    try {
      await this.prisma.ping();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkMongo(): Promise<{ status: string; latencyMs?: number }> {
    const started = Date.now();
    try {
      await this.mongo.db?.admin().ping();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch {
      return { status: 'down' };
    }
  }
}

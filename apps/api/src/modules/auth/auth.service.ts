import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthResponse } from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse & { refreshToken: string }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await UsersService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        // Role is always CUSTOMER here; admin accounts are provisioned by seed.
        role: 'CUSTOMER',
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.users.findByEmail(dto.email);
    // The same message is returned for unknown email and wrong password so the
    // endpoint cannot be used to enumerate accounts.
    const invalid = new UnauthorizedException('Email address or password is incorrect.');
    if (!user || !user.isActive) {
      // Burn comparable time to blunt timing analysis.
      await UsersService.verifyPassword(dto.password, '$2a$12$' + 'x'.repeat(53));
      throw invalid;
    }

    const matches = await UsersService.verifyPassword(dto.password, user.passwordHash);
    if (!matches) throw invalid;

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse & { refreshToken: string }> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    const tokenHash = AuthService.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    const user = await this.users.findById(payload.sub);
    // Rotate: the presented token is revoked as soon as a new pair is issued.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string | undefined, userId: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: AuthService.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse & { refreshToken: string }> {
    const tokens = await this.issueTokens(user);
    return {
      user: UsersService.toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '900s');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl as unknown as number,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl as unknown as number,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: AuthService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + AuthService.ttlToMs(refreshTtl)),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(AuthService.ttlToMs(accessTtl) / 1000),
    };
  }

  /** Only a hash of each refresh token is stored, never the token itself. */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static ttlToMs(ttl: string): number {
    const match = /^(\d+)\s*([smhd])?$/.exec(ttl.trim());
    if (!match) return 900_000;
    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * (multipliers[unit] ?? 1_000);
  }
}

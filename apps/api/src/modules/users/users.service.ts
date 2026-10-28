import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChangePasswordDto, UpdateProfileDto } from '../auth/dto/auth.dto';

export const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  static toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, PASSWORD_SALT_ROUNDS);
  }

  static verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) throw new NotFoundException('User not found.');
    return user;
  }

  async getProfile(id: string): Promise<AuthUser> {
    return UsersService.toAuthUser(await this.findById(id));
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<AuthUser> {
    await this.findById(id);
    // Only whitelisted profile fields are written, so role and status cannot
    // be escalated through a crafted payload.
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
    });
    return UsersService.toAuthUser(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(id);
    const matches = await UsersService.verifyPassword(dto.currentPassword, user.passwordHash);
    if (!matches) throw new BadRequestException('Your current password is incorrect.');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Choose a password you have not used before.');
    }

    const passwordHash = await UsersService.hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash } }),
      // Changing a password revokes every outstanding session.
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}

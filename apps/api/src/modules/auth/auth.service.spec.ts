import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService token helpers', () => {
  it('hashes a refresh token deterministically and irreversibly', () => {
    const token = 'a.sample.refresh.token';
    const hash = AuthService.hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(AuthService.hashToken(token));
    expect(hash).not.toContain(token);
  });

  it('produces a different hash for a different token', () => {
    expect(AuthService.hashToken('one')).not.toBe(AuthService.hashToken('two'));
  });

  it('parses every supported TTL unit', () => {
    expect(AuthService.ttlToMs('900s')).toBe(900_000);
    expect(AuthService.ttlToMs('15m')).toBe(900_000);
    expect(AuthService.ttlToMs('2h')).toBe(7_200_000);
    expect(AuthService.ttlToMs('7d')).toBe(604_800_000);
  });

  it('falls back to 15 minutes for an unparseable TTL', () => {
    expect(AuthService.ttlToMs('not-a-ttl')).toBe(900_000);
  });
});

describe('UsersService password handling', () => {
  it('stores a salted hash, never the password', async () => {
    const hash = await UsersService.hashPassword('CorrectHorse12');
    expect(hash).not.toContain('CorrectHorse12');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await UsersService.hashPassword('CorrectHorse12');
    await expect(UsersService.verifyPassword('CorrectHorse12', hash)).resolves.toBe(true);
    await expect(UsersService.verifyPassword('correcthorse12', hash)).resolves.toBe(false);
  });

  it('salts, so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([
      UsersService.hashPassword('CorrectHorse12'),
      UsersService.hashPassword('CorrectHorse12'),
    ]);
    expect(first).not.toBe(second);
  });

  it('omits the password hash from the public user shape', () => {
    const view = UsersService.toAuthUser({
      id: 'u1',
      email: 'a@b.test',
      passwordHash: 'secret-hash',
      firstName: 'A',
      lastName: 'B',
      phone: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(JSON.stringify(view)).not.toContain('secret-hash');
    expect(view).not.toHaveProperty('passwordHash');
  });
});

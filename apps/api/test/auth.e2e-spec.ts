import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { API, VALID_PASSWORD, createTestApp, uniqueEmail } from './setup';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('registers a customer and issues a session', async () => {
    const email = uniqueEmail('register');
    const response = await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'Test', lastName: 'User' })
      .expect(201);

    expect(response.body.user.email).toBe(email);
    expect(response.body.user.role).toBe('CUSTOMER');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    // The password hash must never leave the server.
    expect(JSON.stringify(response.body)).not.toContain(VALID_PASSWORD);
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('refuses a weak password', async () => {
    await request(server())
      .post(`${API}/auth/register`)
      .send({ email: uniqueEmail('weak'), password: 'short', firstName: 'A', lastName: 'B' })
      .expect(400);
  });

  it('refuses a password with no digit', async () => {
    await request(server())
      .post(`${API}/auth/register`)
      .send({
        email: uniqueEmail('nodigit'),
        password: 'allletterspassword',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(400);
  });

  it('refuses a duplicate email address', async () => {
    const email = uniqueEmail('dupe');
    const payload = { email, password: VALID_PASSWORD, firstName: 'A', lastName: 'B' };
    await request(server()).post(`${API}/auth/register`).send(payload).expect(201);
    await request(server()).post(`${API}/auth/register`).send(payload).expect(409);
  });

  it('rejects an attempt to self-assign the admin role', async () => {
    await request(server())
      .post(`${API}/auth/register`)
      .send({
        email: uniqueEmail('escalate'),
        password: VALID_PASSWORD,
        firstName: 'A',
        lastName: 'B',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('gives the same error for an unknown email and a wrong password', async () => {
    const email = uniqueEmail('timing');
    await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'A', lastName: 'B' })
      .expect(201);

    const wrongPassword = await request(server())
      .post(`${API}/auth/login`)
      .send({ email, password: 'WrongPassw0rd!' })
      .expect(401);

    const unknownEmail = await request(server())
      .post(`${API}/auth/login`)
      .send({ email: uniqueEmail('ghost'), password: VALID_PASSWORD })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(server()).get(`${API}/auth/me`).expect(401);
    await request(server()).get(`${API}/bookings`).expect(401);
  });

  it('rejects a forged bearer token', async () => {
    await request(server())
      .get(`${API}/auth/me`)
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
  });

  it('rotates refresh tokens and revokes the one presented', async () => {
    const email = uniqueEmail('rotate');
    const registered = await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'A', lastName: 'B' })
      .expect(201);

    const first = registered.body.refreshToken;
    const refreshed = await request(server())
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: first })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(first);
    // Replaying the old token must now fail.
    await request(server()).post(`${API}/auth/refresh`).send({ refreshToken: first }).expect(401);
  });

  it('blocks a customer from the admin API', async () => {
    const email = uniqueEmail('customer');
    const registered = await request(server())
      .post(`${API}/auth/register`)
      .send({ email, password: VALID_PASSWORD, firstName: 'A', lastName: 'B' })
      .expect(201);

    await request(server())
      .get(`${API}/admin/overview`)
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(403);
  });
});

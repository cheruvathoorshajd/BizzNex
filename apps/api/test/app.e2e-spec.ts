import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end flows against a real PostgreSQL (DATABASE_URL) with migrations applied.
 * Runs in CI (postgres service) and locally against the embedded database; not part of the unit run.
 */
describe('BizzNex API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health → ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('register → login → create/list project', async () => {
    const email = `e2e_${Date.now()}@bizznex.test`;

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'e2e-password-1', name: 'E2E' })
      .expect(201);
    const token: string = reg.body.token;
    expect(token).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Project' })
      .expect(201);
    expect(created.body.name).toBe('E2E Project');

    const list = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated access to /projects', async () => {
    await request(app.getHttpServer()).get('/projects').expect(401);
  });

  const signUp = async (tag: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e_${tag}_${Date.now()}@bizznex.test`, password: 'e2e-password-1', name: tag })
      .expect(201);
    return res.body as { token: string; user: { email: string } };
  };

  it("keeps each user's records private, including links between records", async () => {
    const [a, b] = [await signUp('alice'), await signUp('bob')];
    const as = (t: string) => ({ Authorization: `Bearer ${t}` });

    const contact = await request(app.getHttpServer()).post('/contacts').set(as(a.token)).send({ name: 'Alice’s client' }).expect(201);
    const deal = await request(app.getHttpServer()).post('/deals').set(as(a.token)).send({ title: 'Alice’s deal', contactId: contact.body.id }).expect(201);

    // Bob can't read, edit, or delete Alice's records…
    const bobsDeals = await request(app.getHttpServer()).get('/deals').set(as(b.token)).expect(200);
    expect(bobsDeals.body).toHaveLength(0);
    await request(app.getHttpServer()).patch(`/deals/${deal.body.id}`).set(as(b.token)).send({ title: 'mine now' }).expect(404);
    await request(app.getHttpServer()).delete(`/contacts/${contact.body.id}`).set(as(b.token)).expect(404);

    // …or attach them to his own
    await request(app.getHttpServer()).post('/deals').set(as(b.token)).send({ title: 'x', contactId: contact.body.id }).expect(400);
    await request(app.getHttpServer()).post('/activities').set(as(b.token)).send({ subject: 'x', dealId: deal.body.id }).expect(400);
  });

  it('signs other sessions out when the password changes', async () => {
    const u = await signUp('carol');
    const other = await request(app.getHttpServer()).post('/auth/login').send({ email: u.user.email, password: 'e2e-password-1' }).expect(201);
    const changed = await request(app.getHttpServer())
      .post('/account/password').set('Authorization', `Bearer ${u.token}`)
      .send({ currentPassword: 'e2e-password-1', newPassword: 'e2e-password-2' })
      .expect(201);

    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${other.body.token}`).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${changed.body.token}`).expect(200);
  });
});

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { anEmployee, freshDb } from './helpers.js';

describe('HTTP API', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    app = createApp(freshDb());
  });

  it('runs the full create → read → update → delete lifecycle', async () => {
    const created = await request(app).post('/api/employees').send(anEmployee({ fullName: 'Lifecycle' })).expect(201);
    const id = created.body.id;

    await request(app).get(`/api/employees/${id}`).expect(200, /Lifecycle/);
    const updated = await request(app).put(`/api/employees/${id}`).send(anEmployee({ salary: 42_000 })).expect(200);
    expect(updated.body.salary).toBe(42_000);

    await request(app).delete(`/api/employees/${id}`).expect(204);
    await request(app).get(`/api/employees/${id}`).expect(404);
  });

  it('returns field-level validation errors', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(anEmployee({ email: 'not-an-email', salary: -5, currency: 'RUPEES' }))
      .expect(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['currency', 'email', 'salary']);
  });

  it('normalises input (trims, lowercases email, uppercases currency)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(anEmployee({ fullName: '  Spaced  ', email: 'UP@ACME.TEST', currency: 'usd' }))
      .expect(201);
    expect(res.body).toMatchObject({ fullName: 'Spaced', email: 'up@acme.test', currency: 'USD' });
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app).post('/api/employees').send(anEmployee({ email: 'x@acme.test' })).expect(201);
    await request(app).post('/api/employees').send(anEmployee({ email: 'x@acme.test' })).expect(409);
  });

  it('lists with pagination, filtering and sorting via query params', async () => {
    for (const salary of [3, 1, 2]) {
      await request(app).post('/api/employees').send(anEmployee({ salary }));
    }
    const res = await request(app).get('/api/employees?sortBy=salary&sortDir=desc&pageSize=2').expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((e: { salary: number }) => e.salary)).toEqual([3, 2]);
  });

  it('rejects unknown sort columns instead of interpolating them into SQL', async () => {
    await request(app).get('/api/employees?sortBy=salary;DROP TABLE employees').expect(400);
  });

  it('serves insights, facets and summary', async () => {
    await request(app).post('/api/employees').send(anEmployee({ country: 'Germany', currency: 'EUR', salary: 50_000 }));
    const insights = await request(app).get('/api/insights?groupBy=country').expect(200);
    expect(insights.body[0]).toMatchObject({ group: 'Germany', currency: 'EUR', median: 50_000 });
    await request(app).get('/api/meta/facets').expect(200, /Germany/);
    const summary = await request(app).get('/api/meta/summary').expect(200);
    expect(summary.body.headcount).toBe(1);
  });

  it('returns 400 for malformed JSON and 404 for unknown API routes', async () => {
    await request(app).post('/api/employees').set('Content-Type', 'application/json').send('{bad').expect(400);
    await request(app).get('/api/nope').expect(404);
  });
});

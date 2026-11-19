import { beforeEach, describe, expect, it } from 'vitest';
import { listQuerySchema } from '../src/domain/employee.js';
import { createEmployeeRepository, type EmployeeRepository } from '../src/repositories/employeeRepository.js';
import { anEmployee, freshDb } from './helpers.js';

const query = (q: Record<string, unknown> = {}) => listQuerySchema.parse(q);

describe('employeeRepository', () => {
  let repo: EmployeeRepository;
  beforeEach(() => {
    repo = createEmployeeRepository(freshDb());
  });

  describe('CRUD', () => {
    it('creates and reads back an employee with generated id and timestamps', () => {
      const created = repo.create(anEmployee({ fullName: 'Asha Rao' }));
      expect(created.id).toBeGreaterThan(0);
      expect(created.createdAt).toBeTruthy();
      expect(repo.findById(created.id)?.fullName).toBe('Asha Rao');
    });

    it('updates an employee and returns undefined for a missing id', () => {
      const { id } = repo.create(anEmployee());
      expect(repo.update(id, anEmployee({ salary: 2_000_000 }))?.salary).toBe(2_000_000);
      expect(repo.update(9999, anEmployee())).toBeUndefined();
    });

    it('deletes an employee and reports whether a row was removed', () => {
      const { id } = repo.create(anEmployee());
      expect(repo.delete(id)).toBe(true);
      expect(repo.delete(id)).toBe(false);
      expect(repo.findById(id)).toBeUndefined();
    });

    it('finds by email case-insensitively', () => {
      repo.create(anEmployee({ email: 'mixed@acme.test' }));
      expect(repo.findByEmail('MIXED@acme.test')).toBeDefined();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      repo.create(anEmployee({ fullName: 'Zara Khan', country: 'India', salary: 900_000 }));
      repo.create(anEmployee({ fullName: 'Adam Smith', country: 'United States', currency: 'USD', salary: 120_000 }));
      repo.create(anEmployee({ fullName: 'Maya Iyer', country: 'India', department: 'Sales', salary: 700_000 }));
    });

    it('paginates and reports the total', () => {
      const page = repo.list(query({ pageSize: 2, page: 2 }));
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(1);
    });

    it('sorts by a whitelisted column in either direction', () => {
      expect(repo.list(query({ sortBy: 'fullName' })).items[0].fullName).toBe('Adam Smith');
      expect(repo.list(query({ sortBy: 'salary', sortDir: 'desc' })).items[0].fullName).toBe('Zara Khan');
    });

    it('combines search with exact filters', () => {
      const result = repo.list(query({ search: 'iyer', country: 'India' }));
      expect(result.items.map((e) => e.fullName)).toEqual(['Maya Iyer']);
    });

    it('treats LIKE wildcards in search as literal characters', () => {
      expect(repo.list(query({ search: '%' })).total).toBe(0);
    });
  });

  describe('insights', () => {
    it('computes headcount, min, max, average and median per group', () => {
      [100, 200, 300, 1000].forEach((salary) => repo.create(anEmployee({ salary, country: 'India' })));
      const [india] = repo.insights({ groupBy: 'country' });
      expect(india).toEqual({ group: 'India', currency: 'INR', headcount: 4, min: 100, max: 1000, average: 400, median: 250 });
    });

    it('uses the middle value as median for odd counts', () => {
      [10, 30, 20].forEach((salary) => repo.create(anEmployee({ salary })));
      expect(repo.insights({ groupBy: 'country' })[0].median).toBe(20);
    });

    it('never mixes currencies within one group', () => {
      repo.create(anEmployee({ jobTitle: 'Designer', country: 'India', currency: 'INR', salary: 1_000_000 }));
      repo.create(anEmployee({ jobTitle: 'Designer', country: 'United States', currency: 'USD', salary: 90_000 }));
      const rows = repo.insights({ groupBy: 'jobTitle' });
      expect(rows.map((r) => r.currency).sort()).toEqual(['INR', 'USD']);
      expect(rows.every((r) => r.headcount === 1)).toBe(true);
    });

    it('applies filters before aggregating', () => {
      repo.create(anEmployee({ department: 'Engineering', salary: 100 }));
      repo.create(anEmployee({ department: 'Sales', salary: 900 }));
      const rows = repo.insights({ groupBy: 'country', department: 'Sales' });
      expect(rows[0]).toMatchObject({ headcount: 1, average: 900 });
    });
  });

  it('returns sorted distinct facets and a summary', () => {
    repo.create(anEmployee({ country: 'India' }));
    repo.create(anEmployee({ country: 'Germany', currency: 'EUR' }));
    expect(repo.facets().countries).toEqual(['Germany', 'India']);
    expect(repo.summary()).toMatchObject({ headcount: 2, countries: 2 });
  });

  it('bulk inserts in a single transaction', () => {
    const rows = Array.from({ length: 500 }, () => anEmployee());
    expect(repo.bulkInsert(rows)).toBe(500);
    expect(repo.summary().headcount).toBe(500);
  });
});

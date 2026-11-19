import type { DB } from '../db/connection.js';
import type {
  Employee,
  EmployeeInput,
  GroupByField,
  InsightRow,
  InsightsQuery,
  ListQuery,
  Paginated,
  SortField,
} from '../domain/employee.js';

/** Whitelisted mapping from API field names to SQL columns. Never interpolate user input directly. */
const COLUMN: Record<SortField | GroupByField, string> = {
  fullName: 'full_name',
  jobTitle: 'job_title',
  department: 'department',
  country: 'country',
  salary: 'salary',
  hiredOn: 'hired_on',
};

interface EmployeeRow {
  id: number;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  country: string;
  currency: string;
  salary: number;
  employment_type: Employee['employmentType'];
  hired_on: string;
  created_at: string;
  updated_at: string;
}

const toEmployee = (r: EmployeeRow): Employee => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  jobTitle: r.job_title,
  department: r.department,
  country: r.country,
  currency: r.currency,
  salary: r.salary,
  employmentType: r.employment_type,
  hiredOn: r.hired_on,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toParams = (e: EmployeeInput) => ({
  full_name: e.fullName,
  email: e.email,
  job_title: e.jobTitle,
  department: e.department,
  country: e.country,
  currency: e.currency,
  salary: e.salary,
  employment_type: e.employmentType,
  hired_on: e.hiredOn,
});

type Filters = Pick<ListQuery, 'search' | 'country' | 'department' | 'jobTitle'>;

/** Builds a parameterised WHERE clause shared by listing and insights. */
function buildWhere(f: Filters): { sql: string; params: Record<string, string> } {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (f.search) {
    // Escape LIKE wildcards so a search for "50%" matches literally.
    clauses.push("(full_name LIKE @search ESCAPE '\\' OR email LIKE @search ESCAPE '\\')");
    params.search = `%${f.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  }
  const exact: [keyof Filters, string][] = [
    ['country', 'country'],
    ['department', 'department'],
    ['jobTitle', 'job_title'],
  ];
  for (const [key, column] of exact) {
    const value = f[key];
    if (value) {
      clauses.push(`${column} = @${key}`);
      params[key] = value;
    }
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function createEmployeeRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO employees (full_name, email, job_title, department, country, currency, salary, employment_type, hired_on)
    VALUES (@full_name, @email, @job_title, @department, @country, @currency, @salary, @employment_type, @hired_on)
  `);
  const updateStmt = db.prepare(`
    UPDATE employees SET full_name=@full_name, email=@email, job_title=@job_title, department=@department,
      country=@country, currency=@currency, salary=@salary, employment_type=@employment_type,
      hired_on=@hired_on, updated_at=datetime('now')
    WHERE id=@id
  `);
  const byIdStmt = db.prepare('SELECT * FROM employees WHERE id = ?');
  const byEmailStmt = db.prepare('SELECT * FROM employees WHERE email = ?');
  const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?');

  return {
    findById(id: number): Employee | undefined {
      const row = byIdStmt.get(id) as EmployeeRow | undefined;
      return row && toEmployee(row);
    },

    findByEmail(email: string): Employee | undefined {
      const row = byEmailStmt.get(email) as EmployeeRow | undefined;
      return row && toEmployee(row);
    },

    create(input: EmployeeInput): Employee {
      const { lastInsertRowid } = insertStmt.run(toParams(input));
      return this.findById(Number(lastInsertRowid))!;
    },

    /** Inserts many rows in one transaction — used by the seed script. */
    bulkInsert(inputs: EmployeeInput[]): number {
      const tx = db.transaction((rows: EmployeeInput[]) => {
        for (const r of rows) insertStmt.run(toParams(r));
      });
      tx(inputs);
      return inputs.length;
    },

    update(id: number, input: EmployeeInput): Employee | undefined {
      const { changes } = updateStmt.run({ ...toParams(input), id });
      return changes ? this.findById(id) : undefined;
    },

    delete(id: number): boolean {
      return deleteStmt.run(id).changes > 0;
    },

    list(q: ListQuery): Paginated<Employee> {
      const { sql: where, params } = buildWhere(q);
      const { total } = db.prepare(`SELECT COUNT(*) AS total FROM employees ${where}`).get(params) as {
        total: number;
      };
      const dir = q.sortDir === 'desc' ? 'DESC' : 'ASC';
      const rows = db
        .prepare(
          `SELECT * FROM employees ${where}
           ORDER BY ${COLUMN[q.sortBy]} ${dir}, id ASC
           LIMIT @limit OFFSET @offset`,
        )
        .all({ ...params, limit: q.pageSize, offset: (q.page - 1) * q.pageSize }) as EmployeeRow[];
      return { items: rows.map(toEmployee), total, page: q.page, pageSize: q.pageSize };
    },

    /**
     * Salary statistics grouped by a dimension, always split by currency so that
     * numbers in different currencies are never mixed. Median is computed in SQL
     * with window functions (average of the middle one or two values).
     */
    insights(q: InsightsQuery): InsightRow[] {
      const { sql: where, params } = buildWhere(q);
      const col = COLUMN[q.groupBy];
      return db
        .prepare(
          `WITH ranked AS (
             SELECT ${col} AS grp, currency, salary,
                    ROW_NUMBER() OVER (PARTITION BY ${col}, currency ORDER BY salary) AS rn,
                    COUNT(*)     OVER (PARTITION BY ${col}, currency)                 AS cnt
             FROM employees ${where}
           )
           SELECT grp AS "group", currency,
                  COUNT(*)              AS headcount,
                  MIN(salary)           AS min,
                  MAX(salary)           AS max,
                  ROUND(AVG(salary))    AS average,
                  ROUND(AVG(CASE WHEN rn IN ((cnt + 1) / 2, (cnt + 2) / 2) THEN salary END)) AS median
           FROM ranked
           GROUP BY grp, currency
           ORDER BY headcount DESC, grp ASC`,
        )
        .all(params) as InsightRow[];
    },

    /** Distinct values for filter dropdowns. */
    facets(): { countries: string[]; departments: string[]; jobTitles: string[] } {
      const distinct = (c: string) =>
        (db.prepare(`SELECT DISTINCT ${c} AS v FROM employees ORDER BY v`).all() as { v: string }[]).map((r) => r.v);
      return { countries: distinct('country'), departments: distinct('department'), jobTitles: distinct('job_title') };
    },

    summary(): { headcount: number; countries: number; departments: number; jobTitles: number } {
      return db
        .prepare(
          `SELECT COUNT(*) AS headcount, COUNT(DISTINCT country) AS countries,
                  COUNT(DISTINCT department) AS departments, COUNT(DISTINCT job_title) AS jobTitles
           FROM employees`,
        )
        .get() as { headcount: number; countries: number; departments: number; jobTitles: number };
    },
  };
}

export type EmployeeRepository = ReturnType<typeof createEmployeeRepository>;

import { z } from 'zod';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;

/** Columns the list endpoint may sort by (whitelist → safe to interpolate into SQL). */
export const SORTABLE_FIELDS = ['fullName', 'jobTitle', 'department', 'country', 'salary', 'hiredOn'] as const;
export type SortField = (typeof SORTABLE_FIELDS)[number];

/** Dimensions the insights endpoint may group by. */
export const GROUP_BY_FIELDS = ['country', 'jobTitle', 'department'] as const;
export type GroupByField = (typeof GROUP_BY_FIELDS)[number];

const trimmed = (max: number) => z.string().trim().min(1, 'Required').max(max);

export const employeeInputSchema = z.object({
  fullName: trimmed(120),
  email: z.string().trim().toLowerCase().pipe(z.email('Must be a valid email').max(254)),
  jobTitle: trimmed(80),
  department: trimmed(80),
  country: trimmed(60),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO currency code'),
  salary: z.coerce
    .number({ error: 'Must be a number' })
    .int('Must be a whole number')
    .positive('Must be greater than 0')
    .max(1_000_000_000, 'Unrealistically large'),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('FULL_TIME'),
  hiredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export interface Employee extends EmployeeInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  country: z.string().trim().optional(),
  department: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  sortBy: z.enum(SORTABLE_FIELDS).default('fullName'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export const insightsQuerySchema = z.object({
  groupBy: z.enum(GROUP_BY_FIELDS).default('country'),
  country: z.string().trim().optional(),
  department: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
});
export type InsightsQuery = z.infer<typeof insightsQuerySchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalaryStats {
  headcount: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

export interface InsightRow extends SalaryStats {
  group: string;
  currency: string;
}

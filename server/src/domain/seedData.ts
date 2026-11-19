import type { EmployeeInput } from './employee.js';

/** Small, fast, seedable PRNG (mulberry32) so generated data is identical on every run. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    /** Picks using relative weights. */
    weighted: <T>(items: readonly { value: T; weight: number }[]): T => {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = next() * total;
      for (const i of items) {
        if ((r -= i.weight) < 0) return i.value;
      }
      return items[items.length - 1].value;
    },
  };
}

interface Country {
  name: string;
  currency: string;
  base: number;
  domain: string;
}

/** Annual base salary for a mid-level (multiplier 1.0) role, in local currency. */
export const COUNTRIES: { value: Country; weight: number }[] = [
  { value: { name: 'India', currency: 'INR', base: 1_800_000, domain: 'in' }, weight: 35 },
  { value: { name: 'United States', currency: 'USD', base: 110_000, domain: 'us' }, weight: 25 },
  { value: { name: 'United Kingdom', currency: 'GBP', base: 60_000, domain: 'uk' }, weight: 10 },
  { value: { name: 'Germany', currency: 'EUR', base: 65_000, domain: 'de' }, weight: 10 },
  { value: { name: 'Canada', currency: 'CAD', base: 90_000, domain: 'ca' }, weight: 8 },
  { value: { name: 'Singapore', currency: 'SGD', base: 85_000, domain: 'sg' }, weight: 7 },
  { value: { name: 'Australia', currency: 'AUD', base: 100_000, domain: 'au' }, weight: 5 },
];

/** Job titles per department with a pay multiplier relative to the country base. */
export const DEPARTMENTS: Record<string, { title: string; multiplier: number }[]> = {
  Engineering: [
    { title: 'Software Engineer', multiplier: 0.9 },
    { title: 'Senior Software Engineer', multiplier: 1.35 },
    { title: 'Staff Engineer', multiplier: 1.8 },
    { title: 'Engineering Manager', multiplier: 1.9 },
    { title: 'QA Engineer', multiplier: 0.8 },
  ],
  Product: [
    { title: 'Product Manager', multiplier: 1.3 },
    { title: 'Senior Product Manager', multiplier: 1.6 },
    { title: 'Product Designer', multiplier: 1.0 },
  ],
  Sales: [
    { title: 'Account Executive', multiplier: 0.95 },
    { title: 'Sales Development Rep', multiplier: 0.6 },
    { title: 'Sales Manager', multiplier: 1.4 },
  ],
  Marketing: [
    { title: 'Marketing Specialist', multiplier: 0.75 },
    { title: 'Marketing Manager', multiplier: 1.2 },
  ],
  Finance: [
    { title: 'Financial Analyst', multiplier: 0.85 },
    { title: 'Finance Manager', multiplier: 1.35 },
  ],
  'Human Resources': [
    { title: 'HR Generalist', multiplier: 0.7 },
    { title: 'HR Manager', multiplier: 1.15 },
  ],
  Operations: [
    { title: 'Operations Associate', multiplier: 0.55 },
    { title: 'Operations Manager', multiplier: 1.1 },
  ],
  'Customer Support': [
    { title: 'Support Specialist', multiplier: 0.5 },
    { title: 'Support Team Lead', multiplier: 0.8 },
  ],
};

const DEPARTMENT_WEIGHTS = [
  { value: 'Engineering', weight: 35 },
  { value: 'Product', weight: 8 },
  { value: 'Sales', weight: 15 },
  { value: 'Marketing', weight: 7 },
  { value: 'Finance', weight: 5 },
  { value: 'Human Resources', weight: 4 },
  { value: 'Operations', weight: 10 },
  { value: 'Customer Support', weight: 16 },
];

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Meera',
  'James', 'Emily', 'Michael', 'Sarah', 'David', 'Olivia', 'Daniel', 'Sophia', 'Matthew', 'Emma',
  'Lukas', 'Hannah', 'Felix', 'Lena', 'Oliver', 'Amelia', 'Noah', 'Chloe', 'Liam', 'Grace',
  'Wei', 'Mei', 'Jun', 'Li', 'Hiro', 'Yuki', 'Omar', 'Fatima', 'Carlos', 'Lucia',
] as const;

const LAST_NAMES = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Singh', 'Kumar', 'Mehta', 'Joshi',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Clark',
  'Müller', 'Schmidt', 'Fischer', 'Weber', 'Walker', 'Wright', 'Evans', 'Thomas', 'Roberts', 'King',
  'Tan', 'Lim', 'Chen', 'Wong', 'Lee', 'Ng', 'Khan', 'Garcia', 'Martin', 'Lopez',
] as const;

const EMPLOYMENT = [
  { value: 'FULL_TIME' as const, weight: 85 },
  { value: 'PART_TIME' as const, weight: 5 },
  { value: 'CONTRACT' as const, weight: 10 },
];

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Rounds to a "human" salary figure (nearest 1,000 or 10,000 for large currencies). */
const roundSalary = (n: number) => (n >= 1_000_000 ? Math.round(n / 10_000) * 10_000 : Math.round(n / 1_000) * 1_000);

/**
 * Generates `count` realistic employees deterministically from `seed`.
 * Salary = country base × role multiplier × noise(±15%) × tenure bump (0–10%).
 */
export function generateEmployees(count: number, seed = 42): EmployeeInput[] {
  const rng = createRng(seed);
  const employees: EmployeeInput[] = [];
  for (let i = 0; i < count; i++) {
    const country = rng.weighted(COUNTRIES);
    const department = rng.weighted(DEPARTMENT_WEIGHTS);
    const role = rng.pick(DEPARTMENTS[department]);
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);

    // Hire dates fall between 2012 and 2025 so none are in the future.
    const hiredYear = rng.int(2012, 2025);
    const hiredOn = `${hiredYear}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
    const tenureBump = 1 + Math.min(2026 - hiredYear, 10) * 0.01;
    const noise = 0.85 + rng.next() * 0.3;
    const salary = roundSalary(country.base * role.multiplier * noise * tenureBump);

    employees.push({
      fullName: `${first} ${last}`,
      // Index suffix guarantees uniqueness across 10k rows with a small name pool.
      email: `${slug(first)}.${slug(last)}.${i + 1}@acme.${country.domain}`.replace('@acme.uk', '@acme.co.uk'),
      jobTitle: role.title,
      department,
      country: country.name,
      currency: country.currency,
      salary,
      employmentType: rng.weighted(EMPLOYMENT),
      hiredOn,
    });
  }
  return employees;
}

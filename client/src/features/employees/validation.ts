import type { EmployeeInput } from '../../api/types';

export type FormValues = Omit<EmployeeInput, 'salary'> & { salary: string };
export type FormErrors = Partial<Record<keyof EmployeeInput, string>>;

export const emptyForm = (): FormValues => ({
  fullName: '',
  email: '',
  jobTitle: '',
  department: '',
  country: '',
  currency: '',
  salary: '',
  employmentType: 'FULL_TIME',
  hiredOn: new Date().toISOString().slice(0, 10),
});

/**
 * Client-side checks that mirror the API's zod schema, for instant feedback.
 * The server remains the source of truth; its field errors are shown too.
 */
export function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  const required: (keyof FormValues)[] = ['fullName', 'email', 'jobTitle', 'department', 'country', 'currency', 'salary', 'hiredOn'];
  for (const key of required) {
    if (!String(v[key]).trim()) errors[key] = 'Required';
  }
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = 'Must be a valid email';
  if (v.currency.trim() && !/^[A-Za-z]{3}$/.test(v.currency.trim())) errors.currency = '3-letter ISO code, e.g. USD';
  if (v.salary.trim()) {
    const n = Number(v.salary);
    if (!Number.isInteger(n) || n <= 0) errors.salary = 'Must be a whole number greater than 0';
  }
  return errors;
}

export function toInput(v: FormValues): EmployeeInput {
  return {
    ...v,
    fullName: v.fullName.trim(),
    email: v.email.trim().toLowerCase(),
    jobTitle: v.jobTitle.trim(),
    department: v.department.trim(),
    country: v.country.trim(),
    currency: v.currency.trim().toUpperCase(),
    salary: Number(v.salary),
  };
}

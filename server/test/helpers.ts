import { openDatabase } from '../src/db/connection.js';
import type { EmployeeInput } from '../src/domain/employee.js';

export const freshDb = () => openDatabase(':memory:');

let counter = 0;
/** Builds a valid employee; override only what a test cares about. */
export function anEmployee(overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  counter += 1;
  return {
    fullName: `Test Person ${counter}`,
    email: `person${counter}@acme.test`,
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    country: 'India',
    currency: 'INR',
    salary: 1_000_000,
    employmentType: 'FULL_TIME',
    hiredOn: '2022-01-15',
    ...overrides,
  };
}

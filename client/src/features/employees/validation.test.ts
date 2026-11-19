import { describe, expect, it } from 'vitest';
import { emptyForm, toInput, validate, type FormValues } from './validation';

const valid: FormValues = {
  ...emptyForm(),
  fullName: 'Asha Rao',
  email: 'asha@acme.in',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  country: 'India',
  currency: 'INR',
  salary: '1800000',
};

describe('employee form validation', () => {
  it('accepts a complete, valid form', () => {
    expect(validate(valid)).toEqual({});
  });

  it('flags every required field on an empty form', () => {
    const errors = validate({ ...emptyForm(), hiredOn: '' });
    expect(Object.keys(errors).sort()).toEqual(
      ['country', 'currency', 'department', 'email', 'fullName', 'hiredOn', 'jobTitle', 'salary'].sort(),
    );
  });

  it.each([
    ['email', 'nope', 'Must be a valid email'],
    ['currency', 'RUPEE', '3-letter ISO code, e.g. USD'],
    ['salary', '-10', 'Must be a whole number greater than 0'],
    ['salary', '12.5', 'Must be a whole number greater than 0'],
  ] as const)('rejects invalid %s "%s"', (field, value, message) => {
    expect(validate({ ...valid, [field]: value })[field]).toBe(message);
  });

  it('normalises values before sending to the API', () => {
    expect(toInput({ ...valid, fullName: '  Asha  ', email: 'ASHA@ACME.IN', currency: 'inr' })).toMatchObject({
      fullName: 'Asha',
      email: 'asha@acme.in',
      currency: 'INR',
      salary: 1_800_000,
    });
  });
});

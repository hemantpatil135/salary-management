import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../src/domain/errors.js';
import { createEmployeeRepository } from '../src/repositories/employeeRepository.js';
import { createEmployeeService, type EmployeeService } from '../src/services/employeeService.js';
import { anEmployee, freshDb } from './helpers.js';

describe('employeeService', () => {
  let service: EmployeeService;
  beforeEach(() => {
    service = createEmployeeService(createEmployeeRepository(freshDb()));
  });

  it('rejects creating an employee with an email already in use', () => {
    service.create(anEmployee({ email: 'dup@acme.test' }));
    expect(() => service.create(anEmployee({ email: 'dup@acme.test' }))).toThrow(ConflictError);
  });

  it('allows an employee to keep their own email on update', () => {
    const e = service.create(anEmployee({ email: 'me@acme.test' }));
    expect(service.update(e.id, anEmployee({ email: 'me@acme.test', salary: 5 })).salary).toBe(5);
  });

  it('rejects taking another employee’s email on update', () => {
    service.create(anEmployee({ email: 'taken@acme.test' }));
    const other = service.create(anEmployee());
    expect(() => service.update(other.id, anEmployee({ email: 'taken@acme.test' }))).toThrow(ConflictError);
  });

  it('throws NotFoundError for unknown ids on get, update and remove', () => {
    expect(() => service.get(42)).toThrow(NotFoundError);
    expect(() => service.update(42, anEmployee())).toThrow(NotFoundError);
    expect(() => service.remove(42)).toThrow(NotFoundError);
  });
});

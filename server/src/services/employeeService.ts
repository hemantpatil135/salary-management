import type { EmployeeInput, InsightsQuery, ListQuery } from '../domain/employee.js';
import { ConflictError, NotFoundError } from '../domain/errors.js';
import type { EmployeeRepository } from '../repositories/employeeRepository.js';

/** Business rules on top of the repository. Inputs are assumed already validated by the route layer. */
export function createEmployeeService(repo: EmployeeRepository) {
  const assertEmailFree = (email: string, exceptId?: number) => {
    const existing = repo.findByEmail(email);
    if (existing && existing.id !== exceptId) {
      throw new ConflictError(`An employee with email ${email} already exists`);
    }
  };

  return {
    list: (q: ListQuery) => repo.list(q),

    get(id: number) {
      const employee = repo.findById(id);
      if (!employee) throw new NotFoundError(`Employee ${id} not found`);
      return employee;
    },

    create(input: EmployeeInput) {
      assertEmailFree(input.email);
      return repo.create(input);
    },

    update(id: number, input: EmployeeInput) {
      this.get(id);
      assertEmailFree(input.email, id);
      return repo.update(id, input)!;
    },

    remove(id: number) {
      if (!repo.delete(id)) throw new NotFoundError(`Employee ${id} not found`);
    },

    insights: (q: InsightsQuery) => repo.insights(q),
    facets: () => repo.facets(),
    summary: () => repo.summary(),
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;

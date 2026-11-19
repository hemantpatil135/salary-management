import type { Employee, EmployeeInput, Facets, Filters, GroupByField, InsightRow, ListParams, Paginated, Summary } from './types';

/** Error carrying the HTTP status and any field-level validation messages from the API. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const toQuery = (params: object) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.fields);
  return body as T;
}

export const api = {
  listEmployees: (p: ListParams) => request<Paginated<Employee>>(`/employees${toQuery(p)}`),
  createEmployee: (e: EmployeeInput) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(e) }),
  updateEmployee: (id: number, e: EmployeeInput) =>
    request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(e) }),
  deleteEmployee: (id: number) => request<void>(`/employees/${id}`, { method: 'DELETE' }),
  insights: (groupBy: GroupByField, filters: Filters) => request<InsightRow[]>(`/insights${toQuery({ groupBy, ...filters })}`),
  facets: () => request<Facets>('/meta/facets'),
  summary: () => request<Summary>('/meta/summary'),
};

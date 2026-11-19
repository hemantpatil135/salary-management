export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

export interface EmployeeInput {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  currency: string;
  salary: number;
  employmentType: EmploymentType;
  hiredOn: string;
}

export interface Employee extends EmployeeInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortField = 'fullName' | 'jobTitle' | 'department' | 'country' | 'salary' | 'hiredOn';
export type GroupByField = 'country' | 'jobTitle' | 'department';

export interface Filters {
  country?: string;
  department?: string;
  jobTitle?: string;
}

export interface ListParams extends Filters {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: SortField;
  sortDir: 'asc' | 'desc';
}

export interface InsightRow {
  group: string;
  currency: string;
  headcount: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

export interface Facets {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

export interface Summary {
  headcount: number;
  countries: number;
  departments: number;
  jobTitles: number;
}

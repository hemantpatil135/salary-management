import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Employee } from '../../api/types';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { EmployeesPage } from './EmployeesPage';

const asha: Employee = {
  id: 1,
  fullName: 'Asha Rao',
  email: 'asha@acme.in',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  country: 'India',
  currency: 'INR',
  salary: 1_800_000,
  employmentType: 'FULL_TIME',
  hiredOn: '2022-01-15',
  createdAt: '',
  updatedAt: '',
};
const facets = { countries: ['India'], departments: ['Engineering'], jobTitles: ['Software Engineer'] };

function setup(overrides: Parameters<typeof mockFetch>[0] = () => undefined) {
  return mockFetch((url, init) => {
    const custom = overrides(url, init);
    if (custom) return custom;
    if (url.pathname === '/api/meta/facets') return { body: facets };
    if (url.pathname === '/api/employees' && (!init?.method || init.method === 'GET')) {
      return { body: { items: [asha], total: 1, page: 1, pageSize: 25 } };
    }
    return undefined;
  });
}

describe('EmployeesPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders employees with salary formatted in their own currency', async () => {
    setup();
    renderWithProviders(<EmployeesPage />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('₹18,00,000')).toBeInTheDocument();
    expect(screen.getByText('1 employees match')).toBeInTheDocument();
  });

  it('sends the search term to the API after debouncing', async () => {
    const fetchSpy = setup();
    renderWithProviders(<EmployeesPage />);
    await screen.findByText('Asha Rao');
    await userEvent.type(screen.getByLabelText('Search employees'), 'rao');
    await waitFor(() =>
      expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('search=rao'))).toBe(true),
    );
  });

  it('requests server-side sorting when a column header is clicked', async () => {
    const fetchSpy = setup();
    renderWithProviders(<EmployeesPage />);
    await screen.findByText('Asha Rao');
    await userEvent.click(screen.getByRole('button', { name: 'Annual salary' }));
    await waitFor(() =>
      expect(fetchSpy.mock.calls.some(([u]) => /sortBy=salary.*sortDir=desc/.test(String(u)))).toBe(true),
    );
  });

  it('shows client-side validation errors without calling the API', async () => {
    const fetchSpy = setup();
    renderWithProviders(<EmployeesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));
    expect(within(dialog).getAllByText('Required').length).toBeGreaterThan(0);
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('creates an employee and auto-fills currency from the country', async () => {
    let posted: Record<string, unknown> | undefined;
    setup((url, init) => {
      if (url.pathname === '/api/employees' && init?.method === 'POST') {
        posted = JSON.parse(String(init.body));
        return { status: 201, body: { ...asha, ...posted, id: 2 } };
      }
    });
    renderWithProviders(<EmployeesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Full name'), 'Ravi Kumar');
    await userEvent.type(within(dialog).getByLabelText('Email'), 'ravi@acme.in');
    await userEvent.type(within(dialog).getByLabelText('Job title'), 'Software Engineer');
    await userEvent.type(within(dialog).getByLabelText('Department'), 'Engineering');
    await userEvent.type(within(dialog).getByLabelText('Country'), 'India');
    await userEvent.type(within(dialog).getByLabelText('Annual salary'), '2000000');
    expect(within(dialog).getByLabelText('Currency')).toHaveValue('INR');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posted).toMatchObject({ fullName: 'Ravi Kumar', country: 'India', currency: 'INR', salary: 2_000_000 });
    expect(await screen.findByText('Added Ravi Kumar')).toBeInTheDocument();
  });

  it('shows the server error when the email is already taken', async () => {
    setup((url, init) => {
      if (url.pathname === '/api/employees/1' && init?.method === 'PUT') {
        return { status: 409, body: { error: 'An employee with email asha@acme.in already exists' } };
      }
    });
    renderWithProviders(<EmployeesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Asha Rao' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
  });

  it('deletes an employee after confirmation', async () => {
    const fetchSpy = setup((url, init) => {
      if (url.pathname === '/api/employees/1' && init?.method === 'DELETE') return { status: 204 };
    });
    renderWithProviders(<EmployeesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Asha Rao' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(fetchSpy.mock.calls.some(([u, init]) => String(u).endsWith('/employees/1') && init?.method === 'DELETE')).toBe(true),
    );
    expect(await screen.findByText('Removed Asha Rao')).toBeInTheDocument();
  });
});

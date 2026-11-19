import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '../../test/utils';
import { InsightsPage } from './InsightsPage';

const row = (group: string, currency: string, median: number) => ({
  group,
  currency,
  headcount: 10,
  min: median / 2,
  max: median * 2,
  average: Math.round(median * 1.1),
  median,
});

function setup() {
  return mockFetch((url) => {
    if (url.pathname === '/api/meta/summary') return { body: { headcount: 10_000, countries: 7, departments: 8, jobTitles: 21 } };
    if (url.pathname === '/api/meta/facets') {
      return { body: { countries: ['Germany', 'India'], departments: ['Engineering'], jobTitles: ['Staff Engineer'] } };
    }
    if (url.pathname === '/api/insights') {
      const groupBy = url.searchParams.get('groupBy');
      if (url.searchParams.get('jobTitle')) return { body: [row('Germany', 'EUR', 117_000), row('India', 'INR', 3_240_000)] };
      if (groupBy === 'department') return { body: [row('Engineering', 'INR', 2_000_000)] };
      return { body: [row('India', 'INR', 1_860_000)] };
    }
  });
}

describe('InsightsPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows org summary and the breakdown by country', async () => {
    setup();
    renderWithProviders(<InsightsPage />);
    expect(await screen.findByText('10,000')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Pay breakdown' });
    expect(within(table).getByText('₹18,60,000')).toBeInTheDocument();
  });

  it('regroups the breakdown when a different dimension is chosen', async () => {
    const fetchSpy = setup();
    renderWithProviders(<InsightsPage />);
    await screen.findByRole('table', { name: 'Pay breakdown' });
    await userEvent.click(screen.getByRole('button', { name: 'By department' }));
    await waitFor(() => expect(fetchSpy.mock.calls.some(([u]) => String(u).includes('groupBy=department'))).toBe(true));
    const table = screen.getByRole('table', { name: 'Pay breakdown' });
    expect(await within(table).findByText('Engineering')).toBeInTheDocument();
  });

  it('compares the selected role across countries in local currency', async () => {
    setup();
    renderWithProviders(<InsightsPage />);
    const table = await screen.findByRole('table', { name: 'Role by country' });
    expect(within(table).getByText('€117,000')).toBeInTheDocument();
    expect(within(table).getByText('₹32,40,000')).toBeInTheDocument();
  });
});

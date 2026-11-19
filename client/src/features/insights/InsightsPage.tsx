import {
  Alert,
  Autocomplete,
  Box,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import type { Filters, GroupByField } from '../../api/types';
import { FilterSelects } from '../../components/FilterSelects';
import { InsightsTable } from './InsightsTable';

const GROUP_LABEL: Record<GroupByField, string> = { country: 'Country', jobTitle: 'Job title', department: 'Department' };

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 160 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>{value?.toLocaleString() ?? '—'}</Typography>
    </Paper>
  );
}

export function InsightsPage() {
  const [groupBy, setGroupBy] = useState<GroupByField>('country');
  const [filters, setFilters] = useState<Filters>({});
  const [role, setRole] = useState<string | null>(null);

  const summary = useQuery({ queryKey: ['summary'], queryFn: api.summary });
  const facets = useQuery({ queryKey: ['facets'], queryFn: api.facets, staleTime: 60_000 });
  const breakdown = useQuery({
    queryKey: ['insights', groupBy, filters],
    queryFn: () => api.insights(groupBy, filters),
    placeholderData: keepPreviousData,
  });
  const selectedRole = role ?? facets.data?.jobTitles[0] ?? null;
  const roleByCountry = useQuery({
    queryKey: ['insights', 'country', { jobTitle: selectedRole }],
    queryFn: () => api.insights('country', { jobTitle: selectedRole! }),
    enabled: Boolean(selectedRole),
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>Salary insights</Typography>
        <Typography variant="body2" color="text.secondary">
          Figures are in each employee's local currency. Groups are split by currency so amounts are never mixed.
        </Typography>
      </Box>

      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
        <StatCard label="Employees" value={summary.data?.headcount} />
        <StatCard label="Countries" value={summary.data?.countries} />
        <StatCard label="Departments" value={summary.data?.departments} />
        <StatCard label="Job titles" value={summary.data?.jobTitles} />
      </Stack>

      <Paper variant="outlined">
        <Stack spacing={2} sx={{ p: 2 }}>
          <Typography variant="h6" component="h2">Pay breakdown</Typography>
          <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={groupBy}
              onChange={(_e, v: GroupByField | null) => v && setGroupBy(v)}
              aria-label="Group by"
            >
              {(Object.keys(GROUP_LABEL) as GroupByField[]).map((g) => (
                <ToggleButton key={g} value={g}>By {GROUP_LABEL[g].toLowerCase()}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FilterSelects facets={facets.data} value={filters} onChange={setFilters} />
          </Stack>
        </Stack>
        {breakdown.isFetching && <LinearProgress />}
        {breakdown.isError && <Alert severity="error">Could not load insights: {breakdown.error.message}</Alert>}
        {breakdown.data && <InsightsTable rows={breakdown.data} groupLabel={GROUP_LABEL[groupBy]} ariaLabel="Pay breakdown" />}
      </Paper>

      <Paper variant="outlined">
        <Stack spacing={2} sx={{ p: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">Compare a role across countries</Typography>
            <Typography variant="body2" color="text.secondary">
              e.g. "What does a Senior Software Engineer earn in India vs Germany?"
            </Typography>
          </Box>
          <Autocomplete
            options={facets.data?.jobTitles ?? []}
            value={selectedRole}
            onChange={(_e, v) => setRole(v)}
            sx={{ maxWidth: 360 }}
            renderInput={(params) => <TextField {...params} size="small" label="Job title" />}
          />
        </Stack>
        {roleByCountry.data && <InsightsTable rows={roleByCountry.data} groupLabel="Country" ariaLabel="Role by country" />}
      </Paper>
    </Stack>
  );
}

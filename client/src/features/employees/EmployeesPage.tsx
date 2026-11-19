import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import type { Employee, EmployeeInput, Filters, SortField } from '../../api/types';
import { FilterSelects } from '../../components/FilterSelects';
import { EMPLOYMENT_LABEL, formatMoney } from '../../lib/format';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { EmployeeFormDialog } from './EmployeeFormDialog';

const COLUMNS: { field: SortField; label: string; align?: 'right' }[] = [
  { field: 'fullName', label: 'Name' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'department', label: 'Department' },
  { field: 'country', label: 'Country' },
  { field: 'salary', label: 'Annual salary', align: 'right' },
  { field: 'hiredOn', label: 'Hired' },
];

type Editing = { mode: 'create' } | { mode: 'edit'; employee: Employee } | null;

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [toast, setToast] = useState<string>();
  const debouncedSearch = useDebouncedValue(search);

  const params = { page: page + 1, pageSize, search: debouncedSearch, sortBy, sortDir, ...filters };
  const list = useQuery({ queryKey: ['employees', params], queryFn: () => api.listEmployees(params), placeholderData: keepPreviousData });
  const facets = useQuery({ queryKey: ['facets'], queryFn: api.facets, staleTime: 60_000 });

  // Any write can change list contents, filter options and insights.
  const invalidate = () => queryClient.invalidateQueries();
  const save = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: EmployeeInput }) =>
      id ? api.updateEmployee(id, input) : api.createEmployee(input),
    onSuccess: (e, { id }) => {
      invalidate();
      setToast(id ? `Saved ${e.fullName}` : `Added ${e.fullName}`);
    },
  });
  const remove = useMutation({
    mutationFn: (e: Employee) => api.deleteEmployee(e.id),
    onSuccess: (_r, e) => {
      invalidate();
      setDeleting(null);
      setToast(`Removed ${e.fullName}`);
    },
  });

  const toggleSort = (field: SortField) => {
    if (field === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else (setSortBy(field), setSortDir(field === 'salary' ? 'desc' : 'asc'));
    setPage(0);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Employees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {list.data ? `${list.data.total.toLocaleString()} employees match` : 'Loading…'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ mode: 'create' })}>
          Add employee
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => (setSearch(e.target.value), setPage(0))}
            sx={{ minWidth: 260, flex: 1 }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search employees' },
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            }}
          />
          <FilterSelects facets={facets.data} value={filters} onChange={(f) => (setFilters(f), setPage(0))} />
        </Stack>
      </Paper>

      {list.isError && <Alert severity="error">Could not load employees: {list.error.message}</Alert>}

      <Paper variant="outlined">
        {list.isFetching && <LinearProgress />}
        <TableContainer>
          <Table size="small" aria-label="Employees">
            <TableHead>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableCell key={c.field} align={c.align} sortDirection={sortBy === c.field ? sortDir : false}>
                    <TableSortLabel active={sortBy === c.field} direction={sortBy === c.field ? sortDir : 'asc'} onClick={() => toggleSort(c.field)}>
                      {c.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data?.items.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{e.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{e.email}</Typography>
                  </TableCell>
                  <TableCell>
                    {e.jobTitle}
                    {e.employmentType !== 'FULL_TIME' && (
                      <Chip label={EMPLOYMENT_LABEL[e.employmentType]} size="small" variant="outlined" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.country}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(e.salary, e.currency)}</TableCell>
                  <TableCell>{e.hiredOn}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" aria-label={`Edit ${e.fullName}`} onClick={() => setEditing({ mode: 'edit', employee: e })}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" aria-label={`Delete ${e.fullName}`} onClick={() => setDeleting(e)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No employees match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={list.data?.total ?? 0}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onRowsPerPageChange={(e) => (setPageSize(Number(e.target.value)), setPage(0))}
        />
      </Paper>

      {editing && (
        <EmployeeFormDialog
          key={editing.mode === 'edit' ? editing.employee.id : 'new'}
          open
          employee={editing.mode === 'edit' ? editing.employee : undefined}
          facets={facets.data}
          onClose={() => setEditing(null)}
          onSubmit={(input) => save.mutateAsync({ id: editing.mode === 'edit' ? editing.employee.id : undefined, input })}
        />
      )}

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Remove employee?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleting?.fullName} will be permanently removed from salary records. This cannot be undone.
          </DialogContentText>
          {remove.isError && <Alert severity="error" sx={{ mt: 2 }}>{remove.error.message}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(undefined)} message={toast} />
    </Stack>
  );
}

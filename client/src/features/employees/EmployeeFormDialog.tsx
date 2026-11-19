import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import type { Employee, EmployeeInput, Facets } from '../../api/types';
import { COUNTRY_CURRENCY, EMPLOYMENT_LABEL } from '../../lib/format';
import { emptyForm, toInput, validate, type FormErrors, type FormValues } from './validation';

interface Props {
  open: boolean;
  employee?: Employee;
  facets?: Facets;
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => Promise<unknown>;
}

const fromEmployee = (e: Employee): FormValues => ({ ...e, salary: String(e.salary) });

/** Add / edit dialog. Mount it with a `key` so it resets when switching between employees. */
export function EmployeeFormDialog({ open, employee, facets, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>(() => (employee ? fromEmployee(employee) : emptyForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setCountry = (country: string) => {
    setValues((v) => ({ ...v, country, currency: COUNTRY_CURRENCY[country] ?? v.currency }));
    setErrors((e) => ({ ...e, country: undefined, currency: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      await onSubmit(toInput(values));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields as FormErrors);
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof FormValues, label: string, extra: object = {}) => (
    <TextField
      label={label}
      value={values[key]}
      onChange={(e) => set(key, e.target.value as never)}
      error={Boolean(errors[key])}
      helperText={errors[key]}
      fullWidth
      size="small"
      slotProps={{ htmlInput: { 'aria-label': label } }}
      {...extra}
    />
  );

  const freeSolo = (key: 'jobTitle' | 'department' | 'country', label: string, options: string[], onChange = (v: string) => set(key, v)) => (
    <Autocomplete
      freeSolo
      options={options}
      inputValue={values[key]}
      onInputChange={(_e, v) => onChange(v)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          error={Boolean(errors[key])}
          helperText={errors[key]}
          slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': label } }}
        />
      )}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{employee ? `Edit ${employee.fullName}` : 'Add employee'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {field('fullName', 'Full name', { autoFocus: true })}
            {field('email', 'Email', { type: 'email' })}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {freeSolo('jobTitle', 'Job title', facets?.jobTitles ?? [])}
              {freeSolo('department', 'Department', facets?.departments ?? [])}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {freeSolo('country', 'Country', facets?.countries ?? [], setCountry)}
              {field('currency', 'Currency', { sx: { maxWidth: { sm: 140 } } })}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {field('salary', 'Annual salary', { type: 'number', slotProps: { htmlInput: { 'aria-label': 'Annual salary', min: 1, step: 1000 } } })}
              {field('employmentType', 'Employment type', {
                select: true,
                children: Object.entries(EMPLOYMENT_LABEL).map(([k, label]) => (
                  <MenuItem key={k} value={k}>
                    {label}
                  </MenuItem>
                )),
              })}
            </Stack>
            {field('hiredOn', 'Hire date', { type: 'date', slotProps: { inputLabel: { shrink: true }, htmlInput: { 'aria-label': 'Hire date' } } })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {employee ? 'Save changes' : 'Add employee'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

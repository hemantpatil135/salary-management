import { MenuItem, TextField } from '@mui/material';
import type { Facets, Filters } from '../api/types';

interface Props {
  facets?: Facets;
  value: Filters;
  onChange: (next: Filters) => void;
}

const FIELDS: { key: keyof Filters; label: string; options: (f: Facets) => string[] }[] = [
  { key: 'country', label: 'Country', options: (f) => f.countries },
  { key: 'department', label: 'Department', options: (f) => f.departments },
  { key: 'jobTitle', label: 'Job title', options: (f) => f.jobTitles },
];

/** Country / department / job title dropdowns shared by the directory and insights pages. */
export function FilterSelects({ facets, value, onChange }: Props) {
  return (
    <>
      {FIELDS.map(({ key, label, options }) => (
        <TextField
          key={key}
          select
          size="small"
          label={label}
          value={value[key] ?? ''}
          onChange={(e) => onChange({ ...value, [key]: e.target.value || undefined })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {(facets ? options(facets) : []).map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </>
  );
}

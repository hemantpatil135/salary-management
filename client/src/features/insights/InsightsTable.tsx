import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import type { InsightRow } from '../../api/types';
import { formatMoney } from '../../lib/format';

/** Visualises where the median sits between min and max for one group. */
function SpreadBar({ row }: { row: InsightRow }) {
  const range = row.max - row.min;
  const pct = (v: number) => (range === 0 ? 50 : ((v - row.min) / range) * 100);
  return (
    <Tooltip title={`Median ${formatMoney(row.median, row.currency)} · Avg ${formatMoney(row.average, row.currency)}`}>
      <Box sx={{ position: 'relative', height: 8, minWidth: 120, borderRadius: 4, bgcolor: 'action.hover' }} aria-hidden>
        <Box sx={{ position: 'absolute', top: -2, width: 3, height: 12, borderRadius: 1, bgcolor: 'primary.main', left: `calc(${pct(row.median)}% - 1px)` }} />
        <Box sx={{ position: 'absolute', top: 1, width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.main', left: `calc(${pct(row.average)}% - 3px)` }} />
      </Box>
    </Tooltip>
  );
}

interface Props {
  rows: InsightRow[];
  groupLabel: string;
  ariaLabel: string;
}

export function InsightsTable({ rows, groupLabel, ariaLabel }: Props) {
  if (rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>
        No employees match these filters.
      </Typography>
    );
  }
  const money = (n: number, c: string) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(n, c)}</span>;
  return (
    <TableContainer>
      <Table size="small" aria-label={ariaLabel}>
        <TableHead>
          <TableRow>
            <TableCell>{groupLabel}</TableCell>
            <TableCell>Currency</TableCell>
            <TableCell align="right">Headcount</TableCell>
            <TableCell align="right">Min</TableCell>
            <TableCell align="right">Median</TableCell>
            <TableCell align="right">Average</TableCell>
            <TableCell align="right">Max</TableCell>
            <TableCell>
              Spread (min → max)
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>▍</Box>median{' '}
                <Box component="span" sx={{ color: 'secondary.main' }}>●</Box> average
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.group}-${r.currency}`} hover>
              <TableCell sx={{ fontWeight: 500 }}>{r.group}</TableCell>
              <TableCell>{r.currency}</TableCell>
              <TableCell align="right">{r.headcount.toLocaleString()}</TableCell>
              <TableCell align="right">{money(r.min, r.currency)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{money(r.median, r.currency)}</TableCell>
              <TableCell align="right">{money(r.average, r.currency)}</TableCell>
              <TableCell align="right">{money(r.max, r.currency)}</TableCell>
              <TableCell><SpreadBar row={r} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

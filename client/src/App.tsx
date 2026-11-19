import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EmployeesPage } from './features/employees/EmployeesPage';
import { InsightsPage } from './features/insights/InsightsPage';

const NAV = [
  { to: '/employees', label: 'Employees', icon: <PeopleIcon fontSize="small" /> },
  { to: '/insights', label: 'Insights', icon: <InsightsIcon fontSize="small" /> },
];

export function App() {
  const { pathname } = useLocation();
  const current = NAV.find((n) => pathname.startsWith(n.to))?.to ?? false;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>ACME · Salaries</Typography>
          <Tabs value={current} aria-label="Main navigation">
            {NAV.map((n) => (
              <Tab key={n.to} value={n.to} label={n.label} icon={n.icon} iconPosition="start" component={Link} to={n.to} sx={{ minHeight: 64 }} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Routes>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}

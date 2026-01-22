// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { store, persistor } from './redux/store.tsx';
import theme from './theme.tsx'; 
import { NotificationProvider } from './context/NotificationContext.tsx';

import { RootState } from './redux/store.tsx';

// Pages
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import EmployeeManagement from './pages/EmployeeManagement.tsx';
import DepartmentManagement from './pages/DepartmentManagement.tsx';
import AttendanceManagement from './pages/AttendanceManagement.tsx';
import LeaveManagement from './pages/LeaveManagement.tsx';
import PayrollManagement from './pages/PayrollManagement.tsx';
import Unauthorized from './pages/Unauthorized.tsx';
import DailyAttendance from './pages/DailyAttendance.tsx';
import UserManagement from './pages/UserManagement.tsx';
import PerformanceManagement from './pages/PerformanceManagement.tsx';
import Reports from './pages/Reports.tsx'

// Layout
import Layout from './components/Layout/Layout.tsx';
import { Report } from '@mui/icons-material';

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles = [] }) => {
  const { token, role } = useSelector((state: RootState) => state.auth);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(role || '')) {
    return <Unauthorized />;
  }

  return <Layout>{children}</Layout>;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/users" element={<PrivateRoute roles={['Superuser']}><UserManagement /></PrivateRoute>} />

        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        <Route
          path="/employees"
          element={<PrivateRoute roles={['Admin', 'HR', 'Superuser']}><EmployeeManagement /></PrivateRoute>}
        />

        <Route
          path="/departments"
          element={<PrivateRoute roles={['Admin', 'Superuser']}><DepartmentManagement /></PrivateRoute>}
        />

        <Route
          path="/attendance"
          element={<PrivateRoute><AttendanceManagement /></PrivateRoute>}
        />

        <Route 
          path="/daily-attendance" 
          element={<PrivateRoute><DailyAttendance /></PrivateRoute>} 
        />

        <Route
          path="/leaves"
          element={<PrivateRoute><LeaveManagement /></PrivateRoute>}
        />

        <Route
          path="/payroll"
          element={<PrivateRoute roles={['Admin', 'HR', 'Superuser']}><PayrollManagement /></PrivateRoute>}
        />
        <Route
          path="/performance"
          element={<PrivateRoute roles={['Admin', 'Manager', 'Superuser']}><PerformanceManagement /></PrivateRoute>}
        />
        <Route
          path="/reports"
          element={<PrivateRoute roles={['Admin', 'HR', 'Superuser']}><Reports /></PrivateRoute>}
        />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider>
            {/* Wrap everything inside LocalizationProvider */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <AppContent />
            </LocalizationProvider>
          </NotificationProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useSelector } from 'react-redux';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import api from '../services/api';
import { RootState } from '../redux/store.tsx';
import { pageContainer } from '../common/mui_components.tsx';

// Constants
const PRESENT_COLOR = '#4caf50';
const LEAVE_COLOR = '#ff9800';
const MONTHS_TO_DISPLAY = 6;

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  newEmployeesThisMonth: number;
  payrollThisMonth: number;
  monthlySalary: number;
  attendanceToday: string;
}

interface ChartData {
  month?: string;
  newJoiners?: number;
  averageRating?: number;
  myRating?: number;
  name?: string;
  value?: number;
}

const AttendanceLegend: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 20, height: 20, bgcolor: PRESENT_COLOR, borderRadius: '4px' }} />
      <Typography variant="body2" fontWeight="medium">
        Present
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 20, height: 20, bgcolor: LEAVE_COLOR, borderRadius: '4px' }} />
      <Typography variant="body2" fontWeight="medium">
        On Leave
      </Typography>
    </Box>
  </Box>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" or ISO strings safely without timezone shift. */
const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  // Handle ISO datetime strings – take only the date part
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

/** Read joining date from any of the common field name variants. */
const getJoiningDate = (emp: any): Date | null =>
  parseDate(
    emp.joining_date ??
    emp.JoiningDate ??
    emp.joiningDate ??
    emp.date_of_joining ??
    emp.DateOfJoining ??
    emp.hire_date ??
    emp.hireDate ??
    null
  );

/**
 * Check whether a payroll record belongs to the given month/year.
 * Supports:
 *   - numeric fields: { month: 4, year: 2026 }
 *   - string fields:  { month: "April 2026" | "Apr 2026" | "2026-04" | "04/2026" }
 *   - period_start / period_end date strings
 */
const payrollMatchesMonth = (p: any, targetMonth: number, targetYear: number): boolean => {
  // 1. Numeric month + year fields
  if (typeof p.month === 'number' && typeof p.year === 'number') {
    return p.month === targetMonth + 1 && p.year === targetYear; // targetMonth is 0-indexed
  }
  if (typeof p.month_number === 'number' && typeof p.year === 'number') {
    return p.month_number === targetMonth + 1 && p.year === targetYear;
  }

  // 2. String month field
  if (typeof p.month === 'string' && p.month.trim() !== '') {
    const monthStr = p.month.trim();

    // "2026-04" or "04-2026"
    const isoMatch = monthStr.match(/^(\d{4})-(\d{2})$/);
    if (isoMatch) {
      return parseInt(isoMatch[1]) === targetYear && parseInt(isoMatch[2]) === targetMonth + 1;
    }
    const isoMatchRev = monthStr.match(/^(\d{2})-(\d{4})$/);
    if (isoMatchRev) {
      return parseInt(isoMatchRev[2]) === targetYear && parseInt(isoMatchRev[1]) === targetMonth + 1;
    }

    // "04/2026" or "2026/04"
    const slashMatch = monthStr.match(/^(\d{1,2})\/(\d{4})$/) || monthStr.match(/^(\d{4})\/(\d{2})$/);
    if (slashMatch) {
      const a = parseInt(slashMatch[1]);
      const b = parseInt(slashMatch[2]);
      if (a > 12) return a === targetYear && b === targetMonth + 1;
      if (b > 12) return b === targetYear && a === targetMonth + 1;
    }

    // "April 2026", "Apr 2026", "april 2026"
    const testDate = new Date(`${monthStr} 1`);
    if (!isNaN(testDate.getTime())) {
      return testDate.getMonth() === targetMonth && testDate.getFullYear() === targetYear;
    }

    // Fallback: contains year and month name
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const lower = monthStr.toLowerCase();
    return lower.includes(String(targetYear)) && lower.includes(monthNames[targetMonth]);
  }

  // 3. period_start / period_end date fields
  const periodDate = parseDate(p.period_start ?? p.period_end ?? p.pay_date ?? p.payDate ?? null);
  if (periodDate) {
    return periodDate.getMonth() === targetMonth && periodDate.getFullYear() === targetYear;
  }

  return false;
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const role = useSelector((state: RootState) => state.auth.role) as string;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string>('User');

  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    newEmployeesThisMonth: 0,
    payrollThisMonth: 0,
    monthlySalary: 0,
    attendanceToday: 'Not marked',
  });

  const [employeeGrowthData, setEmployeeGrowthData] = useState<ChartData[]>([]);
  const [teamPerformanceData, setTeamPerformanceData] = useState<ChartData[]>([]);
  const [personalPerformanceData, setPersonalPerformanceData] = useState<ChartData[]>([]);
  const [attendanceData, setAttendanceData] = useState<ChartData[]>([]);

  // Store employee id as a ref so the single useEffect can access the latest value
  // without needing it as a dependency (avoiding double-fetch).
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(null);
  const [userFetchDone, setUserFetchDone] = useState(false);

  // ── Fetch current user (runs once on mount) ───────────────────────────────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const empRes = await api.get('/employees/current').catch(() => null);

        if (empRes?.data) {
          const emp = empRes.data;
          setCurrentEmployeeId(emp.employee_id ?? emp.id ?? null);
          setUserFullName(
            `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || 'Employee'
          );
        } else {
          const userRes = await api.get('/auth/me').catch(() => null);
          if (userRes?.data) {
            setUserFullName(userRes.data.name ?? userRes.data.username ?? 'Admin');
          }
        }
      } catch {
        console.log('Could not fetch user name');
      } finally {
        // Signal that we're done — fetchData can now run with the correct id.
        setUserFetchDone(true);
      }
    };

    fetchCurrentUser();
  }, []);

  // ── Main data fetch — waits until user info is resolved ───────────────────
  useEffect(() => {
    if (!userFetchDone) return; // Don't run until user fetch completes

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [empRes, leaveRes, payrollRes, attendanceRes, performanceRes] =
          await Promise.all([
            api.get('/employees').catch(() => ({ data: [] })),
            api.get('/leaves').catch(() => ({ data: [] })),
            api.get('/payroll').catch(() => ({ data: [] })),
            api.get('/attendance').catch(() => ({ data: [] })),
            api.get('/performance').catch(() => ({ data: [] })),
          ]);

        const employees: any[]   = empRes.data        || [];
        const leaves: any[]      = leaveRes.data      || [];
        const payrolls: any[]    = payrollRes.data    || [];
        const attendances: any[] = attendanceRes.data || [];
        const performances: any[]= performanceRes.data|| [];

        const now          = new Date();
        const currentMonth = now.getMonth();      // 0-indexed
        const currentYear  = now.getFullYear();

        // ── Basic counts ──────────────────────────────────────────────────

        const total  = employees.length;
        const active = employees.filter(
          (e) => (e.status ?? '').toLowerCase() === 'active'
        ).length;

        const pending = leaves.filter(
          (l) => (l.status ?? '').toLowerCase() === 'pending'
        ).length;

        const newThisMonth = employees.filter((e) => {
          const join = getJoiningDate(e);
          return join?.getMonth() === currentMonth && join?.getFullYear() === currentYear;
        }).length;

        // ── Payroll processed this month (HR card) ────────────────────────
        const payrollThisMonth = payrolls.filter((p) =>
          payrollMatchesMonth(p, currentMonth, currentYear)
        ).length;

        // ── Employee-specific stats ───────────────────────────────────────
        let monthlySalary  = 0;
        let attendanceToday = 'Not marked';

        if (currentEmployeeId !== null) {
          // Monthly salary
          const myPayroll = payrolls.find(
            (p) =>
              (p.employee_id ?? p.employeeId) === currentEmployeeId &&
              payrollMatchesMonth(p, currentMonth, currentYear)
          );
          monthlySalary = myPayroll?.net_salary ?? myPayroll?.netSalary ?? myPayroll?.salary ?? 0;

          // Today's attendance
          const today = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
          const todayAtt = attendances.find(
            (a) =>
              (a.employee_id ?? a.employeeId) === currentEmployeeId &&
              (a.date ?? a.Date ?? '').split('T')[0] === today
          );
          attendanceToday = todayAtt?.status ?? todayAtt?.Status ?? 'Not marked';
        }

        // ── Employee Growth chart (Admin / HR / Superuser) ─────────────────
        if (role === 'Admin' || role === 'HR' || role === 'Superuser') {
          const growthMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const date        = new Date(currentYear, currentMonth - i, 1);
            const monthName   = date.toLocaleString('default', { month: 'short' });
            const targetMonth = date.getMonth();
            const targetYear  = date.getFullYear();

            const count = employees.filter((emp) => {
              const joinDate = getJoiningDate(emp);
              return (
                joinDate !== null &&
                joinDate.getMonth()    === targetMonth &&
                joinDate.getFullYear() === targetYear
              );
            }).length;

            growthMonths.push({ month: monthName, newJoiners: count });
          }
          setEmployeeGrowthData(growthMonths);
        }

        // ── Team Performance chart (Manager) ──────────────────────────────
        if (role === 'Manager') {
          const teamMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const date        = new Date(currentYear, currentMonth - i, 1);
            const monthName   = date.toLocaleString('default', { month: 'short' });
            const targetMonth = date.getMonth();
            const targetYear  = date.getFullYear();

            const monthReviews = performances.filter((p) => {
              const rev = parseDate(p.review_date ?? p.ReviewDate ?? p.reviewDate ?? null);
              return rev?.getMonth() === targetMonth && rev?.getFullYear() === targetYear;
            });

            const avg =
              monthReviews.length > 0
                ? monthReviews.reduce(
                    (sum, r) => sum + (r.rating ?? r.Rating ?? 0),
                    0
                  ) / monthReviews.length
                : 0;

            teamMonths.push({ month: monthName, averageRating: parseFloat(avg.toFixed(1)) });
          }
          setTeamPerformanceData(teamMonths);
        }

        // ── Personal Performance chart (Employee) ──────────────────────────
        if (role === 'Employee' && currentEmployeeId !== null) {
          const personal = performances
            .filter((p) => (p.employee_id ?? p.employeeId) === currentEmployeeId)
            .sort((a, b) => {
              const dateA =
                parseDate(a.review_date ?? a.ReviewDate ?? a.reviewDate ?? null) ?? new Date(0);
              const dateB =
                parseDate(b.review_date ?? b.ReviewDate ?? b.reviewDate ?? null) ?? new Date(0);
              return dateA.getTime() - dateB.getTime();
            })
            .slice(-MONTHS_TO_DISPLAY)
            .map((p) => ({
              month:
                parseDate(
                  p.review_date ?? p.ReviewDate ?? p.reviewDate ?? null
                )?.toLocaleString('default', { month: 'short' }) ?? '',
              myRating: p.rating ?? p.Rating ?? 0,
            }));
          setPersonalPerformanceData(personal);
        }

        // ── Attendance Pie chart ───────────────────────────────────────────
        const isCurrentMonth = (dateStr: string | undefined): boolean => {
          const d = parseDate(dateStr);
          return d !== null && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        const shouldShowAll = role === 'Admin' || role === 'Superuser';

        const presentCount = attendances.filter((att) => {
          const empId = att.employee_id ?? att.employeeId;
          const isRelevant = shouldShowAll || empId === currentEmployeeId;
          return (
            isRelevant &&
            isCurrentMonth((att.date ?? att.Date ?? '').split('T')[0]) &&
            (att.status ?? att.Status ?? '').toLowerCase() === 'present'
          );
        }).length;

        const leaveCount = leaves.filter((leave) => {
          const empId = leave.employee_id ?? leave.employeeId;
          const isRelevant = shouldShowAll || empId === currentEmployeeId;
          const approved = (leave.status ?? '').toLowerCase() === 'approved';
          const startInMonth = isCurrentMonth(leave.start_date ?? leave.StartDate ?? leave.startDate);
          const endInMonth   = isCurrentMonth(leave.end_date   ?? leave.EndDate   ?? leave.endDate);
          return isRelevant && approved && (startInMonth || endInMonth);
        }).length;

        setAttendanceData([
          { name: 'Present',  value: presentCount },
          { name: 'On Leave', value: leaveCount   },
        ]);

        setStats({
          totalEmployees:       total,
          activeEmployees:      active,
          pendingLeaves:        pending,
          newEmployeesThisMonth: newThisMonth,
          payrollThisMonth,
          monthlySalary,
          attendanceToday,
        });
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userFetchDone, currentEmployeeId, role]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={pageContainer}>
      <Typography variant="h4" gutterBottom>
        Hello, {userFullName} 👋
      </Typography>

      <Grid container spacing={3}>
        {/* ── Admin / Superuser cards ─────────────────────────────────── */}
        {(role === 'Admin' || role === 'Superuser') && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Employees</Typography>
                  <Typography variant="h4">{stats.totalEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Active Employees</Typography>
                  <Typography variant="h4">{stats.activeEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Pending Leave Requests</Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* ── HR cards ────────────────────────────────────────────────── */}
        {role === 'HR' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>New Employees (This Month)</Typography>
                  <Typography variant="h4">{stats.newEmployeesThisMonth}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Pending Leaves</Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Payroll Processed (This Month)</Typography>
                  <Typography variant="h4">{stats.payrollThisMonth}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* ── Employee cards ───────────────────────────────────────────── */}
        {role === 'Employee' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Today's Attendance</Typography>
                  <Typography
                    variant="h4"
                    color={
                      (stats.attendanceToday ?? '').toLowerCase() === 'present'
                        ? 'success.main'
                        : 'error.main'
                    }
                  >
                    {stats.attendanceToday}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Monthly Salary</Typography>
                  <Typography variant="h4">
                    ₹{(stats.monthlySalary ?? 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* ── Manager cards ────────────────────────────────────────────── */}
        {role === 'Manager' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Pending Leave Requests</Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Team Size</Typography>
                  <Typography variant="h4">{stats.totalEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* ── Employee Growth chart (Admin / HR / Superuser) ───────────── */}
        {(role === 'Admin' || role === 'HR' || role === 'Superuser') && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employee Growth (Last 6 Months)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employeeGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="newJoiners" fill="#1976d2" name="New Joiners" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Team Performance chart (Manager) ─────────────────────────── */}
        {role === 'Manager' && teamPerformanceData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Performance (Last 6 Months)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="averageRating" fill="#ff9800" name="Avg Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Personal Performance chart (Employee) ────────────────────── */}
        {role === 'Employee' && personalPerformanceData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>My Performance Trend</Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={personalPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="myRating"
                        stroke="#4caf50"
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        name="My Rating"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Attendance Pie chart (all roles) ─────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Summary (This Month)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === 'Present' ? PRESENT_COLOR : LEAVE_COLOR}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <AttendanceLegend />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
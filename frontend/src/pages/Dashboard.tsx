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
const ABSENT_COLOR = '#f44336';
const DEFAULT_LEAVE_BALANCE = 12;
const MONTHS_TO_DISPLAY = 6;

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  newEmployeesThisMonth: number;
  payrollThisMonth: number;
  leaveBalance: number;
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
      <Box sx={{ width: 20, height: 20, bgcolor: ABSENT_COLOR, borderRadius: '4px' }} />
      <Typography variant="body2" fontWeight="medium">
        Absent
      </Typography>
    </Box>
  </Box>
);

const Dashboard: React.FC = () => {
  const role = useSelector((state: RootState) => state.auth.role) as string;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    newEmployeesThisMonth: 0,
    payrollThisMonth: 0,
    leaveBalance: DEFAULT_LEAVE_BALANCE,
    monthlySalary: 0,
    attendanceToday: 'Not marked',
  });
  const [employeeGrowthData, setEmployeeGrowthData] = useState<ChartData[]>([]);
  const [teamPerformanceData, setTeamPerformanceData] = useState<ChartData[]>([]);
  const [personalPerformanceData, setPersonalPerformanceData] = useState<ChartData[]>([]);
  const [attendanceData, setAttendanceData] = useState<ChartData[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(null);

  const parseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      try {
        const res = await api.get('/employees/current');
        setCurrentEmployeeId(res.data.employee_id);
      } catch (err) {
        console.log('No current employee found (normal for Admin/HR/Superuser)');
      }
    };
    fetchCurrentEmployee();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [empRes, leaveRes, payrollRes, attendanceRes, performanceRes] = await Promise.all([
          api.get('/employees').catch(() => ({ data: [] })),
          api.get('/leaves').catch(() => ({ data: [] })),
          api.get('/payroll').catch(() => ({ data: [] })),
          api.get('/attendance').catch(() => ({ data: [] })),
          api.get('/performance').catch(() => ({ data: [] })),
        ]);

        const employees: any[] = empRes.data || [];
        const leaves: any[] = leaveRes.data || [];
        const payrolls: any[] = payrollRes.data || [];
        const attendances: any[] = attendanceRes.data || [];
        const performances: any[] = performanceRes.data || [];

        const total = employees.length;
        const active = employees.filter((e) => e.status === 'Active').length;
        const pending = leaves.filter((l) => l.status === 'Pending').length;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        const newThisMonth = employees.filter((e) => {
          const join = parseDate(e.joining_date);
          return join && join.getMonth() === currentMonth && join.getFullYear() === currentYear;
        }).length;

        const payrollCount = payrolls.filter((p) => p.month === currentMonthYear).length;

        let leaveBalance = DEFAULT_LEAVE_BALANCE;
        let monthlySalary = 0;
        let attendanceToday = 'Not marked';

        if (currentEmployeeId) {
          const myApprovedLeaves = leaves.filter(
            (l) => l.employee_id === currentEmployeeId && l.status === 'Approved'
          );
          leaveBalance = DEFAULT_LEAVE_BALANCE - myApprovedLeaves.length;

          const myPayroll = payrolls.find(
            (p) => p.employee_id === currentEmployeeId && p.month === currentMonthYear
          );
          monthlySalary = myPayroll ? myPayroll.net_salary : 0;

          const today = now.toISOString().split('T')[0];
          const todayAtt = attendances.find(
            (a) => a.employee_id === currentEmployeeId && a.date === today
          );
          attendanceToday = todayAtt ? todayAtt.status || 'Present' : 'Not marked';
        }

        // Employee Growth - Admin & HR & Superuser
        if (role === 'Admin' || role === 'HR' || role === 'Superuser') {
          const growthMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const targetMonth = date.getMonth();
            const targetYear = date.getFullYear();

            const count = employees.filter((emp) => {
              const join = parseDate(emp.joining_date);
              return join && join.getMonth() === targetMonth && join.getFullYear() === targetYear;
            }).length;

            growthMonths.push({ month: monthName, newJoiners: count });
          }
          setEmployeeGrowthData(growthMonths);
        }

        // Team Performance - Manager
        if (role === 'Manager') {
          const teamMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const targetMonth = date.getMonth();
            const targetYear = date.getFullYear();

            const monthReviews = performances.filter((p) => {
              const rev = parseDate(p.review_date);
              return rev && rev.getMonth() === targetMonth && rev.getFullYear() === targetYear;
            });

            const avg =
              monthReviews.length > 0
                ? monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length
                : 0;

            teamMonths.push({ month: monthName, averageRating: parseFloat(avg.toFixed(1)) });
          }
          setTeamPerformanceData(teamMonths);
        }

        // Personal Performance - Employee
        if (role === 'Employee' && currentEmployeeId) {
          const personal = performances
            .filter((p) => p.employee_id === currentEmployeeId)
            .sort((a, b) => {
              const dateA = parseDate(a.review_date) || new Date(0);
              const dateB = parseDate(b.review_date) || new Date(0);
              return dateA.getTime() - dateB.getTime();
            })
            .map((p) => ({
              month: parseDate(p.review_date)?.toLocaleString('default', { month: 'short' }) || '',
              myRating: p.rating,
            }));
          setPersonalPerformanceData(personal);
        }

        // Attendance Pie Chart - Current month
        const isCurrentMonthAttendance = (att: any): boolean => {
          const attDate = parseDate(att.date);
          return (
            attDate !== null &&
            attDate.getMonth() === currentMonth &&
            attDate.getFullYear() === currentYear &&
            (role !== 'Employee' && role !== 'Manager' ? true : att.employee_id === currentEmployeeId)
          );
        };

        const present = attendances.filter(
          (att) => isCurrentMonthAttendance(att) && att.status === 'Present'
        ).length;

        const absent = attendances.filter(
          (att) =>
            isCurrentMonthAttendance(att) && (att.status === 'Absent' || !att.status)
        ).length;

        setAttendanceData([
          { name: 'Present', value: present },
          { name: 'Absent', value: absent },
        ]);

        setStats({
          totalEmployees: total,
          activeEmployees: active,
          pendingLeaves: pending,
          newEmployeesThisMonth: newThisMonth,
          payrollThisMonth: payrollCount,
          leaveBalance,
          monthlySalary,
          attendanceToday,
        });

        setLoading(false);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError('Failed to load dashboard data. Please try refreshing the page.');
        setLoading(false);
      }
    };

    fetchData();
  }, [currentEmployeeId, role]);

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
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* ADMIN CARDS */}
        {role == 'Admin' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Employees
                  </Typography>
                  <Typography variant="h4">{stats.totalEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Employees
                  </Typography>
                  <Typography variant="h4">{stats.activeEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Leave Requests
                  </Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* HR CARDS */}
        {role === 'HR' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    New Employees (This Month)
                  </Typography>
                  <Typography variant="h4">{stats.newEmployeesThisMonth}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Leaves
                  </Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Payroll Processed (This Month)
                  </Typography>
                  <Typography variant="h4">{stats.payrollThisMonth}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* EMPLOYEE CARDS */}
        {role === 'Employee' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Attendance
                  </Typography>
                  <Typography variant="h4">{stats.attendanceToday}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Leave Balance
                  </Typography>
                  <Typography variant="h4">{stats.leaveBalance}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Monthly Salary
                  </Typography>
                  <Typography variant="h4">₹{stats.monthlySalary.toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* MANAGER CARDS */}
        {role === 'Manager' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Leave Requests
                  </Typography>
                  <Typography variant="h4">{stats.pendingLeaves}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Employees
                  </Typography>
                  <Typography variant="h4">{stats.totalEmployees}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Employee Growth Chart - Admin & HR */}
        {(role === 'Admin' || role === 'HR' || role === 'Superuser') && employeeGrowthData.length > 0 && (
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

        {/* Team Performance Chart - Manager */}
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
                      <Bar dataKey="averageRating" fill="#ff9800" name="Team Average Rating" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Personal Performance Chart - Employee */}
        {role === 'Employee' && personalPerformanceData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Performance Growth
                </Typography>
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
                        name="My Rating"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Attendance Pie Chart - All roles */}
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
                      label
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === 'Present' ? PRESENT_COLOR : ABSENT_COLOR}
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
import React, { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert,
} from '@mui/material';
import { BarChart, PieChart, LineChart, pieArcLabelClasses } from '@mui/x-charts';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { RootState } from '../redux/store.tsx';
import { pageContainer } from '../common/mui_components.tsx';

const PRESENT_COLOR    = '#4caf50';
const LEAVE_COLOR      = '#ff9800';
const MONTHS_TO_DISPLAY = 6;

interface Stats {
  totalEmployees:        number;
  activeEmployees:       number;
  pendingLeaves:         number;
  newEmployeesThisMonth: number;
  totalPayrollRecords:   number;
  monthlySalary:         number;
  attendanceToday:       string;
}

interface ChartData {
  month?:         string;
  newJoiners?:    number;
  averageRating?: number;
  myRating?:      number;
  name?:          string;
  value?:         number;
}

const AttendanceLegend: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2 }}>
    {[['Present', PRESENT_COLOR], ['On Leave', LEAVE_COLOR]].map(([label, color]) => (
      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 20, height: 20, bgcolor: color, borderRadius: '4px' }} />
        <Typography variant="body2" fontWeight="medium">{label}</Typography>
      </Box>
    ))}
  </Box>
);

// ── Date Helpers ────────

const parseAnyDate = (raw: string | null | undefined): Date | null => {
  if (!raw) return null;
  const s = String(raw).trim();

  // DD/MM/YYYY  or  D/M/YYYY  or  D/MM/YYYY  or  DD/M/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day   = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10); 
    const year  = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day); 
    }
  }

  // YYYY-MM-DD  or  YYYY-MM-DDTHH:mm:ss
  const isoPart = s.split('T')[0];
  const isoMatch = isoPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year  = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10); 
    const day   = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  return null; 
};

/** Reads joining date from every known field name variant. */
const getJoiningDate = (emp: any): Date | null =>
  parseAnyDate(
    emp.joining_date    ??
    emp.JoiningDate     ??
    emp.joiningDate     ??
    emp.date_of_joining ??
    emp.DateOfJoining   ??
    emp.hire_date       ??
    emp.hireDate        ??
    null
  );


const getMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// ── Role normalisation ────────

const normaliseRole = (r: string): string => {
  if (!r) return '';
  switch (r.toUpperCase()) {
    case 'HR':         return 'HR';
    case 'ADMIN':      return 'Admin';
    case 'SUPERUSER':  return 'Superuser';
    case 'MANAGER':    return 'Manager';
    case 'EMPLOYEE':   return 'Employee';
    default:           return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  }
};

// ── Component ──────────────────

const Dashboard: React.FC = () => {
  const rawRole = useSelector((state: RootState) => state.auth.role) as string;
  const role    = normaliseRole(rawRole);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState('User');

  const [stats, setStats] = useState<Stats>({
    totalEmployees:        0,
    activeEmployees:       0,
    pendingLeaves:         0,
    newEmployeesThisMonth: 0,
    totalPayrollRecords:   0,
    monthlySalary:         0,
    attendanceToday:       'Not marked',
  });

  const [employeeGrowthData,       setEmployeeGrowthData]       = useState<ChartData[]>([]);
  const [teamPerformanceData,      setTeamPerformanceData]      = useState<ChartData[]>([]);
  const [personalPerformanceData,  setPersonalPerformanceData]  = useState<ChartData[]>([]);
  const [attendanceData,           setAttendanceData]           = useState<ChartData[]>([]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(null);
  const [currentEmpSalary,  setCurrentEmpSalary]  = useState<number>(0);
  const [userFetchDone,     setUserFetchDone]      = useState(false);

  // ── 1. Fetch current user / employee ───────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const empRes = await api.get('/employees/current').catch(() => null);

        if (empRes?.data) {
          const emp = empRes.data;
          const id  = emp.employee_id ?? emp.id ?? null;
          setCurrentEmployeeId(id !== null ? Number(id) : null);

          // Annual salary — try every known field name
          const annual = Number(
            emp.salary        ??
            emp.annual_salary ??
            emp.basic_salary  ??
            emp.Salary        ??
            0
          );
          setCurrentEmpSalary(annual);

          setUserFullName(
            `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || 'Employee'
          );
        } else {
          const userRes = await api.get('/auth/me').catch(() => null);
          if (userRes?.data) {
            setUserFullName(userRes.data.name ?? userRes.data.username ?? 'Admin');
          }
        }
      } catch (err) {
        console.error('fetchCurrentUser error:', err);
      } finally {
        setUserFetchDone(true);
      }
    };

    fetchCurrentUser();
  }, []);

  // ── 2. Main data fetch ───────
  useEffect(() => {
    if (!userFetchDone) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [empRes, leaveRes, payrollRes, attendanceRes, performanceRes] =
          await Promise.all([
            api.get('/employees').catch(()    => ({ data: [] })),
            api.get('/leaves').catch(()       => ({ data: [] })),
            api.get('/payroll').catch(()      => ({ data: [] })),
            api.get('/attendance').catch(()   => ({ data: [] })),
            api.get('/performance').catch(()  => ({ data: [] })),
          ]);

        const employees:    any[] = empRes.data         ?? [];
        const leaves:       any[] = leaveRes.data       ?? [];
        const payrolls:     any[] = payrollRes.data     ?? [];
        const attendances:  any[] = attendanceRes.data  ?? [];
        const performances: any[] = performanceRes.data ?? [];

        const now          = new Date();
        const currentMonth = now.getMonth();     
        const currentYear  = now.getFullYear();
        const currentKey   = getMonthKey(now);  

        // ── Debug: verify date parsing ─────────
        console.log('--- Dashboard Debug ---');
        console.log('Role:', role, '| EmpID:', currentEmployeeId, '| CurrentKey:', currentKey);
        console.log('Joining-date parse check →',
          employees.map(e => {
            const raw    = e.joining_date ?? e.JoiningDate ?? e.joiningDate ??
                           e.date_of_joining ?? e.hire_date ?? 'N/A';
            const parsed = getJoiningDate(e);
            return {
              name:   e.name ?? `${e.first_name} ${e.last_name}`,
              raw,
              key:    parsed ? getMonthKey(parsed) : 'PARSE FAILED',
              parsed: parsed?.toDateString() ?? 'PARSE FAILED',
            };
          })
        );

        // ── Basic counts ────────────────
        const total   = employees.length;
        const active  = employees.filter(e => (e.status ?? '').toLowerCase() === 'active').length;
        const pending = leaves.filter(l => (l.status ?? '').toLowerCase() === 'pending').length;

        // ── Employee Growth: bucket all employees by joining month ────────
        const joinerMap: Record<string, number> = {};
        employees.forEach(emp => {
          const join = getJoiningDate(emp);
          if (!join) return;
          const key = getMonthKey(join);
          joinerMap[key] = (joinerMap[key] ?? 0) + 1;
        });
        console.log('Joiner map →', joinerMap, '| Current month key →', currentKey);

        // New joiners this calendar month
        const newThisMonth = joinerMap[currentKey] ?? 0;

        // ── Payroll total ───────────
        const totalPayrollRecords = payrolls.length;

        // ── Monthly salary: annual ÷ 12 from employee record ──────
        const monthlySalary = currentEmpSalary > 0
          ? Math.round(currentEmpSalary / 12)
          : 0;

        // ── Today's attendance ──────────
        let attendanceToday = 'Not marked';
        if (currentEmployeeId !== null) {
          const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

          const getAttEmpId = (a: any): number | null => {
            const raw = a.employee_id ?? a.employeeId ??
                        a.Employee?.employee_id ?? a.Employee?.id ?? null;
            return raw !== null ? Number(raw) : null;
          };

          const todayAtt = attendances.find(a =>
            getAttEmpId(a) === currentEmployeeId &&
            (a.date ?? a.Date ?? '').split('T')[0] === todayStr
          );
          attendanceToday = todayAtt?.status ?? todayAtt?.Status ?? 'Not marked';
        }

        // ── Employee Growth chart data (last N months) ──────
        if (['Admin', 'HR', 'Superuser'].includes(role)) {
          const growthMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const d         = new Date(currentYear, currentMonth - i, 1);
            const key       = getMonthKey(d);
            const monthName = d.toLocaleString('default', { month: 'short' });
            growthMonths.push({ month: monthName, newJoiners: joinerMap[key] ?? 0 });
          }
          console.log('Growth chart data →', growthMonths);
          setEmployeeGrowthData(growthMonths);
        }

        // ── Team Performance chart (Manager) ─────────────────────────────
        if (role === 'Manager') {
          const teamMonths: ChartData[] = [];
          for (let i = MONTHS_TO_DISPLAY - 1; i >= 0; i--) {
            const d         = new Date(currentYear, currentMonth - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const tMonth    = d.getMonth();
            const tYear     = d.getFullYear();

            const reviews = performances.filter(p => {
              const rev = parseAnyDate(p.review_date ?? p.ReviewDate ?? p.reviewDate ?? null);
              return rev?.getMonth() === tMonth && rev?.getFullYear() === tYear;
            });

            const avg = reviews.length
              ? reviews.reduce((s, r) => s + Number(r.rating ?? r.Rating ?? 0), 0) / reviews.length
              : 0;

            teamMonths.push({ month: monthName, averageRating: parseFloat(avg.toFixed(1)) });
          }
          setTeamPerformanceData(teamMonths);
        }

        // ── Personal Performance chart (Employee) ───────────
        if (role === 'Employee' && currentEmployeeId !== null) {
          const getPerfEmpId = (p: any): number | null => {
            const raw = p.employee_id ?? p.employeeId ??
                        p.Employee?.employee_id ?? p.Employee?.id ?? null;
            return raw !== null ? Number(raw) : null;
          };

          const personal = performances
            .filter(p => getPerfEmpId(p) === currentEmployeeId)
            .sort((a, b) => {
              const dA = parseAnyDate(a.review_date ?? a.ReviewDate ?? a.reviewDate) ?? new Date(0);
              const dB = parseAnyDate(b.review_date ?? b.ReviewDate ?? b.reviewDate) ?? new Date(0);
              return dA.getTime() - dB.getTime();
            })
            .slice(-MONTHS_TO_DISPLAY)
            .map(p => ({
              month:    parseAnyDate(p.review_date ?? p.ReviewDate ?? p.reviewDate)
                          ?.toLocaleString('default', { month: 'short' }) ?? '',
              myRating: Number(p.rating ?? p.Rating ?? 0),
            }));

          setPersonalPerformanceData(personal);
        }

        // ── Attendance Pie chart ─────────────
        const shouldShowAll = role === 'Admin' || role === 'Superuser';

        const getAttEmpId = (a: any): number | null => {
          const raw = a.employee_id ?? a.employeeId ??
                      a.Employee?.employee_id ?? a.Employee?.id ?? null;
          return raw !== null ? Number(raw) : null;
        };

        const isThisMonth = (dateStr: string | undefined): boolean => {
          if (!dateStr) return false;
          // attendance dates come as "YYYY-MM-DD" from backend
          const d = parseAnyDate(dateStr);
          return d !== null && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        const presentCount = attendances.filter(att => {
          const relevant = shouldShowAll || getAttEmpId(att) === currentEmployeeId;
          return (
            relevant &&
            isThisMonth((att.date ?? att.Date ?? '').split('T')[0]) &&
            (att.status ?? att.Status ?? '').toLowerCase() === 'present'
          );
        }).length;

        const leaveCount = leaves.filter(leave => {
          const empId   = Number(leave.employee_id ?? leave.employeeId ?? null);
          const relevant = shouldShowAll || empId === currentEmployeeId;
          const approved = (leave.status ?? '').toLowerCase() === 'approved';
          const startIn  = isThisMonth(leave.start_date ?? leave.StartDate ?? leave.startDate);
          const endIn    = isThisMonth(leave.end_date   ?? leave.EndDate   ?? leave.endDate);
          return relevant && approved && (startIn || endIn);
        }).length;

        setAttendanceData([
          { name: 'Present',  value: presentCount } as any,
          { name: 'On Leave', value: leaveCount   } as any,
        ]);

        setStats({
          totalEmployees:        total,
          activeEmployees:       active,
          pendingLeaves:         pending,
          newEmployeesThisMonth: newThisMonth,
          totalPayrollRecords,
          monthlySalary,
          attendanceToday,
        });

      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userFetchDone, currentEmployeeId, currentEmpSalary, role]);

  // ── Render ───────────────

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
        Hello, {userFullName} !
      </Typography>

      <Grid container spacing={3}>

        {/* Admin / Superuser */}
        {(role === 'Admin' || role === 'Superuser') && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Total Employees</Typography>
                <Typography variant="h4">{stats.totalEmployees}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Active Employees</Typography>
                <Typography variant="h4">{stats.activeEmployees}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Pending Leave Requests</Typography>
                <Typography variant="h4">{stats.pendingLeaves}</Typography>
              </CardContent></Card>
            </Grid>
          </>
        )}

        {/* HR */}
        {role === 'HR' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>New Employees (This Month)</Typography>
                <Typography variant="h4">{stats.newEmployeesThisMonth}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Pending Leaves</Typography>
                <Typography variant="h4">{stats.pendingLeaves}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Total Payroll Records</Typography>
                <Typography variant="h4">{stats.totalPayrollRecords}</Typography>
              </CardContent></Card>
            </Grid>
          </>
        )}

        {/* Employee */}
        {role === 'Employee' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Today's Attendance</Typography>
                <Typography
                  variant="h4"
                  color={(stats.attendanceToday).toLowerCase() === 'present'
                    ? 'success.main' : 'error.main'}
                >
                  {stats.attendanceToday}
                </Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Monthly Salary</Typography>
                <Typography variant="h4">
                  ₹{stats.monthlySalary.toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" color="textSecondary">Annual ÷ 12</Typography>
              </CardContent></Card>
            </Grid>
          </>
        )}

        {/* Manager */}
        {role === 'Manager' && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Pending Leave Requests</Typography>
                <Typography variant="h4">{stats.pendingLeaves}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card><CardContent>
                <Typography color="textSecondary" gutterBottom>Team Size</Typography>
                <Typography variant="h4">{stats.totalEmployees}</Typography>
              </CardContent></Card>
            </Grid>
          </>
        )}

        {/* Employee Growth Chart */}
        {['Admin', 'HR', 'Superuser'].includes(role) && employeeGrowthData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>
                Employee Growth (Last {MONTHS_TO_DISPLAY} Months)
              </Typography>
              <Box sx={{ height: 300 }}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: employeeGrowthData.map(d => d.month) }]}
                  series={[{
                    data:  employeeGrowthData.map(d => d.newJoiners ?? 0),
                    label: 'New Joiners',
                    color: '#1976d2',
                  }]}
                  height={300}
                />
              </Box>
            </CardContent></Card>
          </Grid>
        )}

        {/* Team Performance Chart */}
        {role === 'Manager' && teamPerformanceData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>
                Team Performance (Last {MONTHS_TO_DISPLAY} Months)
              </Typography>
              <Box sx={{ height: 300 }}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: teamPerformanceData.map(d => d.month) }]}
                  series={[{
                    data:  teamPerformanceData.map(d => d.averageRating ?? 0),
                    label: 'Avg Rating',
                    color: '#ff9800',
                  }]}
                  yAxis={[{ min: 0, max: 5 }]}
                  height={300}
                />
              </Box>
            </CardContent></Card>
          </Grid>
        )}

        {/* Personal Performance Chart */}
        {role === 'Employee' && personalPerformanceData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>My Performance Trend</Typography>
              <Box sx={{ height: 300 }}>
                <LineChart
                  xAxis={[{ scaleType: 'band', data: personalPerformanceData.map(d => d.month) }]}
                  series={[{
                    data:     personalPerformanceData.map(d => d.myRating ?? 0),
                    label:    'My Rating',
                    color:    '#4caf50',
                    showMark: true,
                  }]}
                  yAxis={[{ min: 0, max: 5 }]}
                  height={300}
                />
              </Box>
            </CardContent></Card>
          </Grid>
        )}

        {/* Attendance Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Attendance Summary (This Month)</Typography>
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
              <PieChart
                colors={[PRESENT_COLOR, LEAVE_COLOR]}
                series={[{
                  data:         attendanceData as any,
                  innerRadius:  30,
                  outerRadius:  100,
                  paddingAngle: 5,
                  cornerRadius: 5,
                  valueFormatter: (v: any) => `${v.value}`,
                }]}
                sx={{
                  [`& .${pieArcLabelClasses.root}`]: {
                    fill: 'white', fontWeight: 'bold',
                  },
                }}
                height={280}
              />
            </Box>
            <AttendanceLegend />
          </CardContent></Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
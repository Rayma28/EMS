// src/pages/AttendanceManagement.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Popover,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { PieChart } from '@mui/x-charts/PieChart';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { CalendarToday, Clear, Event } from '@mui/icons-material';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { useNotification } from '../context/NotificationContext.tsx';
import {
  pageContainer,
  headerSection,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';

interface AttendanceRow {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

interface AllAttendanceRow {
  id: number;
  employee: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface MonthlySummary {
  present: number;
  leave: number;
}

const AttendanceManagement: React.FC = () => {
  const { role } = useSelector((state: any) => state.auth);
  const [allAttendance, setAllAttendance] = useState<AllAttendanceRow[]>([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRow[]>([]);
  const [monthlyLeaves, setMonthlyLeaves] = useState<string[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({ present: 0, leave: 0 });
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [dailyCalendarAnchorEl, setDailyCalendarAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [monthCalendarAnchorEl, setMonthCalendarAnchorEl] = useState<HTMLButtonElement | null>(null);

  const optionalColumns = ['check_in', 'check_out'] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    employee: true,
    date: true,
    check_in: true,
    check_out: true,
    status: true,
  });

  const checkTodayStatus = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const month = dayjs().format('YYYY-MM');
      const res = await api.get(`/attendance/monthly/${month}`);
      const todayRecord = res.data.find((a: any) => a.date === today);
      if (todayRecord) {
        setCheckedIn(!!todayRecord.check_in && !todayRecord.check_out);
      } else {
        setCheckedIn(false);
      }
    } catch (err) {
      console.error('Error checking today status:', err);
      setCheckedIn(false);
    }
  };

  useEffect(() => {
    if (role === 'Admin' || role === 'HR' || role === 'Manager' || role === 'Superuser') {
      fetchAllAttendance();
    }
    if (role === 'Employee' || role === 'HR' || role === 'Manager') {
      fetchMonthlyData();
      checkTodayStatus();
    }
  }, [selectedMonth, selectedDate, role]);

  const fetchMonthlyData = async () => {
    try {
      const month = selectedMonth.format('YYYY-MM');
      const attRes = await api.get(`/attendance/monthly/${month}`);
      const attData = attRes.data;

      let leaveDates: string[] = [];
      try {
        const leaveRes = await api.get(`/leaves/monthly/${month}`);
        leaveDates = leaveRes.data.map((l: any) => l.date);
      } catch (leaveErr) {
        console.log('Leave data not available');
      }

      setMonthlyAttendance(attData);
      setMonthlyLeaves(leaveDates);

      const present = attData.length;
      const leave = leaveDates.length;

      setMonthlySummary({ present, leave });
    } catch (err: any) {
      console.error('Monthly data error:', err);
      showNotification('Failed to load attendance data', 'error');
    }
  };

  const fetchAllAttendance = async () => {
    try {
      let url = `/attendance/all/monthly/${selectedMonth.format('YYYY-MM')}`;
      if (selectedDate) {
        url = `/attendance/all/date/${selectedDate.format('YYYY-MM-DD')}`;
      }
      const res = await api.get(url);
      setAllAttendance(
        res.data.map((a: any) => ({
          id: a.attendance_id || a.id || Math.random(),
          employee: `${a.Employee?.first_name || ''} ${a.Employee?.last_name || ''}`.trim() || 'N/A',
          date: dayjs(a.date).format('YYYY-MM-DD'),
          check_in: a.check_in || '-',
          check_out: a.check_out || '-',
          status: a.status || 'Present',
        }))
      );
    } catch (err: any) {
      console.error('All attendance error:', err);
      showNotification('Failed to load all employees attendance', 'error');
    }
  };

  const handleCheckIn = async () => {
    try {
      await api.post('/attendance/checkin');
      setCheckedIn(true);
      showNotification('Checked in successfully', 'success');
      fetchMonthlyData();
      checkTodayStatus();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to check in', 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/checkout');
      setCheckedIn(false);
      showNotification('Checked out successfully', 'success');
      fetchMonthlyData();
      checkTodayStatus();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to check out', 'error');
    }
  };

  const handleDailyCalendarClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDailyCalendarAnchorEl(event.currentTarget);
  };

  const handleDailyCalendarClose = () => {
    setDailyCalendarAnchorEl(null);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
    handleDailyCalendarClose();
  };

  const handleMonthCalendarClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMonthCalendarAnchorEl(event.currentTarget);
  };

  const handleMonthCalendarClose = () => {
    setMonthCalendarAnchorEl(null);
  };

  const handleMonthChange = (newMonth: Dayjs | null) => {
    if (newMonth) {
      setSelectedMonth(newMonth);
    }
    handleMonthCalendarClose();
  };

  const columns: GridColDef[] = [
    { field: 'employee', headerName: 'Employee', flex: 1, minWidth: 200 }, 
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      minWidth: 150,
      renderHeader: () => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>Date</span>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {selectedDate && (
              <Tooltip title="Clear date filter">
                <IconButton size="small" onClick={handleClearDate}>
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Select specific date">
              <IconButton size="small" onClick={handleDailyCalendarClick}>
                <CalendarToday fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ),
    },
    { field: 'check_in', headerName: 'Check In', flex: 1, minWidth: 120 },
    { field: 'check_out', headerName: 'Check Out', flex: 1, minWidth: 120 },
    { field: 'status', headerName: 'Status', flex: 1, minWidth: 120 },
  ];

  const isAdminOrManagerOrSuperuser = role === 'Admin' || role === 'HR' || role === 'Manager' || role === 'Superuser';

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Attendance Management</Typography>
      </Box>

      {/* Check In / Out Buttons */}
      {(role === 'Employee' || role === 'HR' || role === 'Manager') && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCheckIn}
              disabled={checkedIn}
              size="large"
            >
              Check In
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCheckOut}
              disabled={!checkedIn}
              size="large"
            >
              Check Out
            </Button>
          </Grid>
        </Grid>
      )}

      {/* Personal Monthly Summary - Only Present & Leave */}
      {(role === 'Employee' || role === 'HR' || role === 'Manager') && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" gutterBottom>
            My Attendance Summary ({selectedMonth.format('MMMM YYYY')})
          </Typography>
          <PieChart
            series={[
              {
                data: [
                  { id: 0, value: monthlySummary.present, label: `Present (${monthlySummary.present})`, color: '#4caf50' },
                  { id: 1, value: monthlySummary.leave, label: `Leave (${monthlySummary.leave})`, color: '#ff9800' },
                ].filter(item => item.value > 0), 
                innerRadius: 40,
                outerRadius: 100,
                paddingAngle: 5,
                cornerRadius: 8,
              },
            ]}
            width={500}
            height={300}
          />
        </Box>
      )}

      {/* View Daily Attendance Button */}
      {(role === 'Employee' || role === 'HR' || role === 'Manager') && (
        <Box sx={{ mb: 6 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/daily-attendance')}
            size="large"
          >
            View Daily Attendance
          </Button>
        </Box>
      )}

      {/* All Employees Attendance Table */}
      {isAdminOrManagerOrSuperuser && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">All Employees Attendance</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="text.secondary">
                Viewing: <strong>{selectedMonth.format('MMMM YYYY')}</strong>
              </Typography>
              <Tooltip title="Change month/year">
                <IconButton onClick={handleMonthCalendarClick} color="primary">
                  <Event />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <DataGrid
            rows={allAttendance}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
            pagination
            disableColumnMenu
            slots={{
              toolbar: () => (
                <CustomToolbar
                  columnVisibilityModel={columnVisibilityModel}
                  setColumnVisibilityModel={setColumnVisibilityModel}
                  optionalColumns={optionalColumns}
                />
              ),
            }}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
            sx={dataGridHeader}
          />

          {/* Daily Date Picker Popover */}
          <Popover
            open={Boolean(dailyCalendarAnchorEl)}
            anchorEl={dailyCalendarAnchorEl}
            onClose={handleDailyCalendarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedDate}
                onChange={(newDate) => {
                  setSelectedDate(newDate);
                  handleDailyCalendarClose();
                }}
                views={['year', 'month', 'day']}
                openTo="day"
              />
            </LocalizationProvider>
          </Popover>

          {/* Month/Year Picker Popover */}
          <Popover
            open={Boolean(monthCalendarAnchorEl)}
            anchorEl={monthCalendarAnchorEl}
            onClose={handleMonthCalendarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedMonth}
                onChange={handleMonthChange}
                views={['year', 'month']}
                openTo="month"
                showDaysOutsideCurrentMonth
              />
            </LocalizationProvider>
          </Popover>
        </Box>
      )}
    </Box>
  );
};

export default AttendanceManagement;
// src/pages/DailyAttendance.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Popper,
  ClickAwayListener,
  Grow,
} from '@mui/material';
import { ChevronLeft, ChevronRight, CalendarToday } from '@mui/icons-material';
import {
  DateCalendar,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';
import { pageContainer, headerSection } from '../common/mui_components.tsx';

const DailyAttendance: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [presentDates, setPresentDates] = useState<string[]>([]);
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    try {
      const month = selectedMonth.format('YYYY-MM');

      const attRes = await api.get(`/attendance/monthly/${month}`);
      const present = attRes.data.map((a: any) => a.date);
      setPresentDates(present);

      let leaves: string[] = [];
      try {
        const leaveRes = await api.get(`/leaves/monthly/${month}`);
        leaves = leaveRes.data;
      } catch (leaveErr) {
        console.log('Leaves data not available');
      }
      setLeaveDates(leaves);
    } catch (err: any) {
      console.error('Monthly data error:', err);
      showNotification('Failed to load daily attendance', 'error');
    }
  };

  const prevMonth = () => setSelectedMonth(selectedMonth.subtract(1, 'month'));
  const nextMonth = () => setSelectedMonth(selectedMonth.add(1, 'month'));

  const startOfMonth = selectedMonth.startOf('month');
  const endOfMonth = selectedMonth.endOf('month');

  let startDate = startOfMonth.day(1); 
  if (startDate.date() > 7) startDate = startDate.subtract(1, 'week');

  const endDate = endOfMonth.day(7); 

  const weeks = [];
  let current = startDate.clone();
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(current.clone());
      current = current.add(1, 'day');
    }
    weeks.push(week);
  }

  const getStatus = (day: Dayjs): 'P' | 'L' | null => {
    if (!day.isSame(selectedMonth, 'month')) return null;

    const dateStr = day.format('YYYY-MM-DD');

    if (leaveDates.includes(dateStr)) return 'L';
    if (presentDates.includes(dateStr)) return 'P';

    return null;
  };

  const getColor = (status: 'P' | 'L' | null): string => {
    switch (status) {
      case 'P': return '#4caf50'; 
      case 'L': return '#ff9800'; 
      default: return 'transparent';
    }
  };

  const getLabel = (status: 'P' | 'L' | null): string => {
    switch (status) {
      case 'P': return 'P';
      case 'L': return 'L';
      default: return '';
    }
  };

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Daily Attendance</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={prevMonth}>
            <ChevronLeft />
          </IconButton>

          <Button
            variant="outlined"
            startIcon={<CalendarToday />}
            onClick={handleClick}
            sx={{ minWidth: 200, justifyContent: 'center' }}
          >
            {selectedMonth.format('MMMM YYYY')}
          </Button>

          <IconButton onClick={nextMonth}>
            <ChevronRight />
          </IconButton>
        </Box>

        <Button variant="outlined" onClick={() => navigate('/attendance')}>
          Back to Attendance
        </Button>
      </Box>

      {/* Calendar Picker Popper */}
      <Popper open={open} anchorEl={anchorEl} transition placement="bottom-start">
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar
                      views={['year', 'month']}
                      openTo="month"
                      value={selectedMonth}
                      onChange={(newValue) => {
                        if (newValue) {
                          setSelectedMonth(newValue as Dayjs);
                        }
                        handleClose();
                      }}
                    />
                  </LocalizationProvider>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>

      {/* Legend - Only Present & Leave */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, my: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#4caf50' }} />
          <Typography variant="body2">Present</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#ff9800' }} />
          <Typography variant="body2">Leave</Typography>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <TableCell key={day} align="center" sx={{ fontWeight: 'bold' }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, weekIndex) => (
              <TableRow key={weekIndex}>
                {week.map((day, dayIndex) => {
                  const status = getStatus(day);
                  const dateNumber = day.format('D');
                  const isCurrentMonth = day.isSame(selectedMonth, 'month');
                  const isToday = day.isSame(dayjs(), 'day');

                  return (
                    <TableCell
                      key={dayIndex}
                      align="center"
                      sx={{
                        height: 120,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        verticalAlign: 'top',
                        pt: 2,
                        border: isToday ? '3px solid #1976d2' : '1px solid #e0e0e0',
                        borderRadius: isToday ? '8px' : 0,
                      }}
                    >
                      <Box sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                        {dateNumber}
                      </Box>

                      {status && (
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            bgcolor: getColor(status),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.4rem',
                            mx: 'auto',
                            mt: 1, // Small margin from date number
                          }}
                        >
                          {getLabel(status)}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DailyAttendance;
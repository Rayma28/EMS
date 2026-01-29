// src/pages/Reports.tsx
import React, { useState } from 'react';
import {
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import api from '../services/api';

type ReportType = 'employees' | 'attendance' | 'payroll';

const Reports: React.FC = () => {
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');   
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const handleExport = async (type: ReportType) => {
    setLoading(type);
    setError(null);

    try {
      const params: Record<string, string> = {};

      // Only attendance & payroll support filters
      if (type === 'attendance' || type === 'payroll') {
        if (!month && !year) {
          setError('Please select month or year for Attendance/Payroll reports');
          return;
        }
        if (month) params.month = month;
        if (year) params.year = year;
      }

      const response = await api.get(`/reports/${type}`, {
        params,
        responseType: 'blob',
      });

      const filename = `${type}_report${month ? `_${month}` : year ? `_${year}` : ''}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(`Failed to export ${type} report:`, err);
      setError(
        err.response?.data?.message ||
          `Failed to download ${type} report. Please try again.`
      );
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (type: ReportType) => loading === type;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Reports
        </Typography>

        {/* Filters for Attendance & Payroll */}
        <Box
          sx={{
            mb: 4,
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Filter (for Attendance & Payroll Reports)
          </Typography>

          <Box 
            sx={{ 
              display: 'flex', 
              gap: 3, 
              flexWrap: 'wrap', 
              alignItems: 'flex-end',
              '& .MuiFormControl-root': {
                marginTop: 0,
              },
            }}
          >
            {/* Month Picker */}
            <TextField
              label="Month"
              type="month"
              value={month}
              onChange={(e) => {
                const newMonth = e.target.value;
                setMonth(newMonth);
                if (newMonth) setYear('');
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
            />

            {/* Year Picker */}
            <DatePicker
              label="Year"
              views={['year']} 
              value={year ? dayjs(`${year}-01-01`) : null}
              onChange={(newValue) => {
                if (newValue) {
                  const selectedYear = newValue.year().toString();
                  setYear(selectedYear);
                  setMonth(''); 
                } else {
                  setYear('');
                }
              }}
              minDate={dayjs('2000-01-01')}
              maxDate={dayjs(`${currentYear + 5}-12-31`)}
              slotProps={{
                textField: {
                  sx: { width: 200 },
                },
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Employee Report no filter needed */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              p={4}
              border="1px solid"
              borderColor="divider"
              borderRadius={2}
              textAlign="center"
              bgcolor="background.paper"
              minHeight={180}
              display="flex"
              flexDirection="column"
              justifyContent="center"
            >
              <Typography variant="h6" gutterBottom>
                Employee Report
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleExport('employees')}
                disabled={isLoading('employees')}
                fullWidth
                sx={{ mt: 2, py: 1.5 }}
              >
                {isLoading('employees') ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Exporting...
                  </>
                ) : (
                  'Export Excel'
                )}
              </Button>
            </Box>
          </Grid>

          {/* Attendance Report */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              p={4}
              border="1px solid"
              borderColor="divider"
              borderRadius={2}
              textAlign="center"
              bgcolor="background.paper"
              minHeight={180}
              display="flex"
              flexDirection="column"
              justifyContent="center"
            >
              <Typography variant="h6" gutterBottom>
                Attendance Report
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleExport('attendance')}
                disabled={isLoading('attendance') || (!month && !year)}
                fullWidth
                sx={{ mt: 2, py: 1.5 }}
              >
                {isLoading('attendance') ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Exporting...
                  </>
                ) : (
                  'Export Excel'
                )}
              </Button>
            </Box>
          </Grid>

          {/* Payroll Report */}
          <Grid item xs={12} sm={6} md={4}>
            <Box
              p={4}
              border="1px solid"
              borderColor="divider"
              borderRadius={2}
              textAlign="center"
              bgcolor="background.paper"
              minHeight={180}
              display="flex"
              flexDirection="column"
              justifyContent="center"
            >
              <Typography variant="h6" gutterBottom>
                Payroll Report
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleExport('payroll')}
                disabled={isLoading('payroll') || (!month && !year)}
                fullWidth
                sx={{ mt: 2, py: 1.5 }}
              >
                {isLoading('payroll') ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Exporting...
                  </>
                ) : (
                  'Export Excel'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;
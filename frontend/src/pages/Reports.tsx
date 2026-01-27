// src/pages/Reports.tsx
import React, { useState } from 'react';
import { Typography, Button, Box, Grid, TextField } from '@mui/material';
import api from '../services/api';

type ReportType = 'employees' | 'attendance' | 'payroll';

const Reports: React.FC = () => {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const handleExport = async (type: ReportType) => {
    try {
      const params: any = {};

      // Filters for attendance and payroll only
      if (type === 'attendance' || type === 'payroll') {
        if (month) params.month = month;
        else if (year) params.year = year;
        else {
          alert('Please select either a month or a year');
          return;
        }
      }

      const res = await api.get(`/reports/${type}`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${type}_report${month ? `_${month}` : year ? `_${year}` : ''}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${type} report:`, error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {/*=== Common Filter ===*/}
      <Box
        p={3}
        mb={3}
        border="1px solid"
        borderRadius={2}
        display="flex"
        alignItems="center"
        gap={2}
        flexWrap="wrap"
      >
        <Typography variant="h6">Filter (applies to Attendance & Payroll)</Typography>

        <TextField
          label="Month"
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setYear('');
          }}
          disabled={!!year}
          sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Year"
          type="date"
          value={year ? `${year}-01-01` : ''}
          onChange={(e) => {
            const selectedYear = new Date(e.target.value).getFullYear();
            setYear(selectedYear.toString());
            setMonth('');
          }}
          disabled={!!month}
          sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }}
          helperText="Select any date to generate yearly report"
        />
      </Box>

      {/*=== Report Cards ===*/}
      <Grid container spacing={3}>
        {/* Employee Report */}
        <Grid item xs={12} sm={6} md={4}>
          <Box p={3} border="1px solid" borderRadius={2} textAlign="center">
            <Typography variant="h6">Employee Report</Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => handleExport('employees')}
              fullWidth
            >
              Export Excel
            </Button>
          </Box>
        </Grid>

        {/* Attendance Report */}
        <Grid item xs={12} sm={6} md={4}>
          <Box p={3} border="1px solid" borderRadius={2} textAlign="center">
            <Typography variant="h6">Attendance Report</Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => handleExport('attendance')}
              fullWidth
              disabled={!month && !year}
            >
              Export Excel
            </Button>
          </Box>
        </Grid>

        {/* Payroll Report */}
        <Grid item xs={12} sm={6} md={4}>
          <Box p={3} border="1px solid" borderRadius={2} textAlign="center">
            <Typography variant="h6">Payroll Report</Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => handleExport('payroll')}
              fullWidth
              disabled={!month && !year}
            >
              Export Excel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
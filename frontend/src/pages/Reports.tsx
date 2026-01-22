// src/pages/Reports.tsx
import React from 'react';
import { Typography, Button, Box, Grid } from '@mui/material';
import api from '../services/api';

// Optional: define the possible report types (helps with type safety)
type ReportType = 'employees' | 'attendance' | 'payroll';

const Reports: React.FC = () => {
  const handleExport = async (type: ReportType) => {
    try {
      const res = await api.get(`/reports/${type}`, {
        responseType: 'blob', // important for downloading files
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.xlsx`);
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download ${type} report:`, error);
      // Optional: show user notification
      // showNotification(`Failed to download ${type} report`, 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Box
            p={3}
            border="1px solid"
            borderColor="divider"
            borderRadius={2}
            textAlign="center"
            bgcolor="background.paper"
            sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: 3 } }}
          >
            <Typography variant="h6" gutterBottom>
              Employee Report
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleExport('employees')}
              fullWidth
              sx={{ mt: 2 }}
            >
              Export Excel
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box
            p={3}
            border="1px solid"
            borderColor="divider"
            borderRadius={2}
            textAlign="center"
            bgcolor="background.paper"
            sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: 3 } }}
          >
            <Typography variant="h6" gutterBottom>
              Attendance Report
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleExport('attendance')}
              fullWidth
              sx={{ mt: 2 }}
            >
              Export Excel
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Box
            p={3}
            border="1px solid"
            borderColor="divider"
            borderRadius={2}
            textAlign="center"
            bgcolor="background.paper"
            sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: 3 } }}
          >
            <Typography variant="h6" gutterBottom>
              Payroll Report
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleExport('payroll')}
              fullWidth
              sx={{ mt: 2 }}
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
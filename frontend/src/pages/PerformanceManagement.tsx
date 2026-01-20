// src/pages/PerformanceManagement.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Rating,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Edit as EditIcon } from '@mui/icons-material';
import api from '../services/api';
import {
  pageContainer,
  headerSection,
  dialogOuterPadding,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';
import { useNotification } from '../context/NotificationContext.tsx';

interface Employee {
  employee_id?: number;
  first_name: string;
  last_name: string;
  designation: string;
}

interface ReviewRow {
  id: number | string;
  employee_name: string;
  employee_id: number;      
  rating: number;
  feedback: string;
  date: string;
}

interface FormData {
  review_id?: number | string;  
  employee_id: string;
  rating: number | null;
  feedback: string;
}

const PerformanceManagement: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<FormData>({
    employee_id: '',
    rating: null,
    feedback: '',
  });

  const optionalColumns = ['rating', 'date'] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    employee_name: true,
    rating: true,
    feedback: true,
    date: true,
    actions: true,
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/performance');
      const formatted = res.data.map((r: any) => ({
        id: r.review_id,
        employee_id: r.employee_id,
        employee_name: r.Employee
          ? `${r.Employee.first_name || ''} ${r.Employee.last_name || ''}`.trim() || 'N/A'
          : 'N/A',
        rating: Number(r.rating) || 0,
        feedback: r.feedback || '',
        date: r.review_date || 'N/A',
      }));
      setReviews(formatted);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      showNotification('Failed to load performance reviews', 'error');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      const validEmployees = res.data
        .map((emp: any) => ({
          employee_id: emp.employee_id || emp.id || null,
          first_name: emp.first_name || 'Unknown',
          last_name: emp.last_name || '',
          designation: emp.designation || 'N/A',
        }))
        .filter((emp: Employee) => emp.employee_id !== null)
        .filter((emp: Employee) => {
          const des = emp.designation.toLowerCase();
          return des !== 'admin' && des !== 'hr';
        });

      setEmployees(validEmployees);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      showNotification('Failed to load employees list', 'error');
    }
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setForm({ employee_id: '', rating: null, feedback: '' });
    setOpen(true);
  };

  const handleOpenEdit = (row: ReviewRow) => {
    setIsEditMode(true);
    setForm({
      review_id: row.id,
      employee_id: String(row.employee_id || ''),
      rating: row.rating,
      feedback: row.feedback,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsEditMode(false);
  };

  const handleSubmit = async () => {
    if (!form.employee_id) {
      showNotification('Please select an employee', 'error');
      return;
    }
    if (form.rating === null || form.rating < 0.5) {
      showNotification('Please provide a rating', 'error');
      return;
    }
    if (!form.feedback.trim()) {
      showNotification('Feedback is required', 'error');
      return;
    }

    try {
      const payload = {
        employee_id: Number(form.employee_id),
        rating: form.rating,
        feedback: form.feedback.trim(),
      };

      if (isEditMode && form.review_id) {
        await api.put(`/performance/${form.review_id}`, payload);
        showNotification('Performance review updated successfully', 'success');
      } else {
        await api.post('/performance', {
          ...payload,
        });
        showNotification('Performance review submitted successfully', 'success');
      }

      handleClose();
      fetchReviews();
    } catch (err: any) {
      console.error('Review submit/update failed:', err);
      showNotification(
        err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'submit'} review`,
        'error'
      );
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 160,
      renderCell: (params) => (
        <Rating value={params.value as number} readOnly precision={0.5} />
      ),
    },
    {
      field: 'feedback',
      headerName: 'Feedback',
      flex: 2,
      minWidth: 320,
    },
    {
      field: 'date',
      headerName: 'Review Date',
      width: 140,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Edit Review">
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenEdit(params.row as ReviewRow)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Performance Management</Typography>
        <Button variant="contained" onClick={handleOpenCreate}>
          Submit Review
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={reviews}
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
      </Box>

      {/* Submit / Update Review Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>
          {isEditMode ? 'Edit Performance Review' : 'Submit Performance Review'}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Employee"
            margin="dense"
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            required
            disabled={isEditMode} // prevent changing employee on edit
          >
            {employees.length === 0 ? (
              <MenuItem disabled>No employees available</MenuItem>
            ) : (
              employees.map((emp, idx) => (
                <MenuItem
                  key={emp.employee_id ?? `emp-${idx}`}
                  value={emp.employee_id?.toString() ?? ''}
                >
                  {emp.first_name} {emp.last_name} — {emp.designation}
                </MenuItem>
              ))
            )}
          </TextField>

          <Box sx={{ my: 2 }}>
            <Typography component="legend" variant="body2" gutterBottom>
              Rating
            </Typography>
            <Rating
              name="review-rating"
              value={form.rating}
              onChange={(_, value) => setForm({ ...form, rating: value })}
              precision={0.5}
              size="large"
            />
          </Box>

          <TextField
            fullWidth
            label="Feedback / Comments"
            margin="dense"
            multiline
            rows={5}
            value={form.feedback}
            onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            required
            inputProps={{ maxLength: 1200 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {isEditMode ? 'Update Review' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceManagement;
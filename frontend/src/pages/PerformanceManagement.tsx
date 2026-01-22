// src/pages/PerformanceManagement.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  Rating,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
  review_month: string; 
}

const PerformanceManagement: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<string>('unknown');

  const [form, setForm] = useState<FormData>({
    employee_id: '',
    rating: null,
    feedback: '',
    review_month: new Date().toISOString().slice(0, 7), 
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
    const fetchRole = async () => {
      try {
        const res = await api.get('/employees/current');
        const role = res.data?.User?.role || res.data?.role || 'unknown';
        console.log('Current user role fetched:', role);
        setCurrentUserRole(role.toLowerCase());
      } catch (err: any) {
        console.error('Failed to fetch current user role:', err);
        showNotification('Could not determine your role. Some features may be limited.', 'warning');
        setCurrentUserRole('unknown');
      }
    };

    fetchRole();
  }, []);

  useEffect(() => {
    if (currentUserRole !== 'unknown') {
      fetchReviews();
      fetchEmployees();
    }
  }, [currentUserRole]);

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
      console.log('Raw employees from /api/employees:', res.data);

      let filtered: Employee[] = res.data
        .map((emp: any) => ({
          employee_id: emp.employee_id || emp.id || null,
          first_name: emp.first_name || 'Unknown',
          last_name: emp.last_name || '',
          designation: (emp.designation || 'N/A').trim(),
        }))
        .filter((emp: any): emp is Employee => emp.employee_id !== null);

      console.log('After basic mapping & id filter:', filtered);

      const role = currentUserRole.toLowerCase();

      if (role === 'manager') {
        filtered = filtered.filter(
          (emp: Employee) => emp.designation.toLowerCase() === 'employee'
        );
      } else if (role === 'admin') {
        filtered = filtered.filter((emp: Employee) =>
          emp.designation.toLowerCase().includes('manager')
        );
      } else {
        filtered = [];
      }

      // Always exclude admin & hr
      filtered = filtered.filter((emp: Employee) => {
        const des = emp.designation.toLowerCase();
        return des !== 'admin' && des !== 'hr';
      });

      console.log('Final filtered employees for dropdown:', filtered);

      setEmployees(filtered);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      if (err.response?.status === 403) {
        showNotification('You do not have permission to view employees', 'error');
      } else {
        showNotification('Failed to load employees list', 'error');
      }
    }
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setForm({
      employee_id: '',
      rating: null,
      feedback: '',
      review_month: new Date().toISOString().slice(0, 7),
    });
    setOpen(true);
  };

  const handleOpenEdit = (row: ReviewRow) => {
    setIsEditMode(true);
    setForm({
      review_id: row.id,
      employee_id: String(row.employee_id || ''),
      rating: row.rating,
      feedback: row.feedback,
      review_month: new Date().toISOString().slice(0, 7),
    });
    setOpen(true);
  };

  const handleOpenDelete = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsEditMode(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/performance/${deleteId}`);
      showNotification('Performance review deleted successfully', 'success');
      fetchReviews();
    } catch (err: any) {
      console.error('Delete failed:', err);
      showNotification(
        err.response?.data?.message || 'Failed to delete performance review',
        'error'
      );
    } finally {
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.employee_id) {
      showNotification('Please select an employee', 'error');
      return;
    }

    if (!form.review_month || !/^\d{4}-\d{2}$/.test(form.review_month)) {
      showNotification('Please select a valid review month (YYYY-MM)', 'error');
      return;
    }

    const ratingValue = form.rating; 

    if (ratingValue === null || ratingValue < 0.5 || ratingValue > 5.0) {
      showNotification('Please provide a rating between 0.5 and 5.0', 'error');
      return;
    }

    if ((ratingValue * 2) % 1 !== 0) {
      showNotification('Rating must be in 0.5 increments (e.g. 1.0, 1.5, 2.0, ..., 5.0)', 'error');
      return;
    }

    if (!form.feedback.trim()) {
      showNotification('Feedback is required', 'error');
      return;
    }

    try {
      const payload = {
        employee_id: Number(form.employee_id),
        rating: ratingValue,           
        feedback: form.feedback.trim(),
        review_month: form.review_month,
      };

      if (isEditMode && form.review_id) {
        await api.put(`/performance/${form.review_id}`, payload);
        showNotification('Performance review updated successfully', 'success');
      } else {
        await api.post('/performance', payload);
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
      flex: 1.2,
      minWidth: 240,
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 240,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', justifyContent: 'left', width: '100%' }}>
          <Rating
            value={params.value as number}
            readOnly
            precision={0.5}  
            size="medium"
          />
        </Box>
      ),
    },
    {
      field: 'feedback',
      headerName: 'Feedback',
      flex: 3,
      minWidth: 380,
    },
    {
      field: 'date',
      headerName: 'Review Date',
      width: 240,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit Review">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenEdit(params.row as ReviewRow)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Review">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleOpenDelete(Number(params.row.id))}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
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
            disabled={isEditMode}
          >
            {employees.length === 0 ? (
              <MenuItem disabled>
                {currentUserRole === 'manager'
                  ? 'No employees available under your team'
                  : currentUserRole === 'admin'
                  ? 'No managers available for review (check if designation contains "manager")'
                  : currentUserRole === 'unknown'
                  ? 'Loading your role... Please wait'
                  : `No eligible employees available for role: ${currentUserRole}`}
              </MenuItem>
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

          {/* Month Picker */}
          <TextField
            fullWidth
            label="Review Month"
            type="month"
            margin="dense"
            value={form.review_month}
            onChange={(e) => setForm({ ...form, review_month: e.target.value })}
            required
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: '2020-01',
              max: new Date().toISOString().slice(0, 7),
            }}
          />

          <Box sx={{ my: 2 }}>
            <Typography component="legend" variant="body2" gutterBottom>
              Rating (0.5-5.0 stars)
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
          <Button variant="contained" onClick={handleSubmit} disabled={employees.length === 0}>
            {isEditMode ? 'Update Review' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this performance review? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceManagement;
// src/pages/LeaveManagement.tsx
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
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Delete as DeleteIcon, CheckCircle as CheckIcon, Cancel as RejectIcon } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';
import {
  pageContainer,
  headerSection,
  dataGridHeader,
  CustomToolbar,
  dialogOuterPadding,
} from '../common/mui_components.tsx';

interface RootState {
  auth: {
    role: string;
    userId: number;
  };
}

interface LeaveRow {
  id: number;
  employee: string;
  type: string;
  start: string;
  end: string;
  status: string;
  reason: string;
  ownerUserId: number;
  ownerRole: string;
}

interface LeaveForm {
  leave_type: 'Casual' | 'Sick' | 'HalfDay';
  start_date: string;
  end_date: string;
  reason: string;
}

const LeaveManagement: React.FC = () => {
  const { role: currentUserRole, userId: currentUserId } = useSelector((state: RootState) => state.auth);
  const { showNotification } = useNotification();

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<LeaveForm>({
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const optionalColumns = ['reason'] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    employee: true,
    type: true,
    start: true,
    end: true,
    status: true,
    reason: true,
    actions: true,
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');

      const mappedLeaves: LeaveRow[] = res.data.map((l: any) => ({
        id: l.leave_id,
        employee: `${l.Employee?.first_name || ''} ${l.Employee?.last_name || ''}`.trim() || 'N/A',
        type: l.leave_type,
        start: l.start_date || 'N/A',
        end: l.end_date || 'N/A',
        status: l.status || 'Pending',
        reason: l.reason || 'N/A',
        ownerUserId: l.Employee?.user_id || null,
        ownerRole: l.Employee?.User?.role || 'Employee',
      }));

      setLeaves(mappedLeaves);
    } catch (err: any) {
      console.error('Error fetching leaves:', err);
      showNotification('Failed to load leave requests', 'error');
    }
  };

  const handleApply = async () => {
    if (!form.start_date || !form.end_date || !form.reason) {
      showNotification('Please fill all fields', 'error');
      return;
    }

    const today = getTodayDate();
    if (form.start_date < today || form.end_date < today) {
      showNotification('Cannot select past dates. Please select today or future dates.', 'error');
      return;
    }

    if (form.start_date > form.end_date) {
      showNotification('End date cannot be before start date', 'error');
      return;
    }

    try {
      await api.post('/leaves/apply', form);
      showNotification('Leave applied successfully', 'success');
      setOpen(false);
      setForm({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
      fetchLeaves();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to apply leave', 'error');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/leaves/${id}/approve`);
      showNotification('Leave approved', 'success');
      fetchLeaves();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Not authorized to approve this leave', 'error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/leaves/${id}/reject`);
      showNotification('Leave rejected', 'success');
      fetchLeaves();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Not authorized to reject this leave', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/leaves/${deleteId}`);
      showNotification('Leave request deleted successfully', 'success');
      fetchLeaves();
    } catch (err: any) {
      showNotification('Failed to delete leave request', 'error');
    } finally {
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const canApproveOrReject = (row: LeaveRow) => {
    if (row.ownerUserId === currentUserId) return false;

    const ownerRole = row.ownerRole;

    if (currentUserRole === 'Admin' || currentUserRole === 'Superuser') return true;
    if (currentUserRole === 'HR') return ownerRole === 'Employee' || ownerRole === 'Manager';
    if (currentUserRole === 'Manager') return ownerRole === 'Employee';
    return false;
  };

  const handleLeaveTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newType = e.target.value as 'Casual' | 'Sick' | 'HalfDay';
    setForm((prev) => ({
      ...prev,
      leave_type: newType,
      end_date: newType === 'HalfDay' && prev.start_date ? prev.start_date : prev.end_date,
    }));
  };

  const columns: GridColDef[] = [
    { field: 'employee', headerName: 'Employee', flex: 1, minWidth: 200 },
    { field: 'type', headerName: 'Type', flex: 1, minWidth: 130 },
    { field: 'start', headerName: 'Start Date', flex: 1, minWidth: 150 },
    { field: 'end', headerName: 'End Date', flex: 1, minWidth: 150 },
    { field: 'status', headerName: 'Status', flex: 1, minWidth: 130 },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 250 },
  ];

  columns.push({
    field: 'actions',
    headerName: 'Actions',
    width: 280,
    sortable: false,
    renderCell: (params) => {
      const row = params.row as LeaveRow;

      if (row.status === 'Approved') {
        return (
          <Chip
            icon={<CheckIcon />}
            label="Approved"
            color="success"
            variant="outlined"
            size="small"
          />
        );
      }

      if (row.status === 'Rejected') {
        return (
          <Chip
            icon={<RejectIcon />}
            label="Rejected"
            color="error"
            variant="outlined"
            size="small"
          />
        );
      }

      // Pending
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {canApproveOrReject(row) && (
            <>
              <Button size="small" variant="contained" color="success" onClick={() => handleApprove(row.id)}>
                Approve
              </Button>
              <Button size="small" variant="contained" color="error" onClick={() => handleReject(row.id)}>
                Reject
              </Button>
            </>
          )}
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDeleteClick(row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
  });

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Leave Management</Typography>

        {(currentUserRole === 'Employee' || currentUserRole === 'HR' || currentUserRole === 'Manager') && (
          <Button variant="contained" onClick={() => setOpen(true)}>
            Apply for Leave
          </Button>
        )}
      </Box>

      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          maxWidth: '100%',
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: '950px' }}>
          <DataGrid
            rows={leaves}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
            pagination
            getRowId={(row) => row.id}
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
      </Box>

      {/* Apply Leave Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Leave Type"
            value={form.leave_type}
            onChange={handleLeaveTypeChange}
            margin="normal"
          >
            <MenuItem value="Casual">Casual Leave</MenuItem>
            <MenuItem value="Sick">Sick Leave</MenuItem>
            <MenuItem value="HalfDay">Half Day</MenuItem>
          </TextField>

          <TextField
            type="date"
            fullWidth
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            value={form.start_date}
            onChange={(e) => {
              const newStart = e.target.value;
              setForm((prev) => ({
                ...prev,
                start_date: newStart,
                end_date: prev.leave_type === 'HalfDay' ? newStart : prev.end_date,
              }));
            }}
            margin="normal"
            inputProps={{ min: getTodayDate() }}
          />

          <TextField
            type="date"
            fullWidth
            label="End Date"
            InputLabelProps={{ shrink: true }}
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            margin="normal"
            disabled={form.leave_type === 'HalfDay'}
            inputProps={{
              min: form.start_date || getTodayDate(),
            }}
          />

          <TextField
            fullWidth
            label="Reason"
            multiline
            rows={4}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this leave request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagement;
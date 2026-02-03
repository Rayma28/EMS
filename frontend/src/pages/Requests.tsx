import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
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
    employee_id: number | null;
  };
}

interface RequestRow {
  request_id: number;
  requester_id: number;
  items: string;
  description: string;
  status: string;
  manager_reason?: string;
  admin_reason?: string;
  created_at: string;
  Requester?: {
    id: number;
    username: string;
    email: string;
    role: string;
    Employee?: {
      first_name?: string;
      last_name?: string;
    };
  };
  ManagerApprover?: { username: string };
  AdminApprover?: { username: string };
}

const Requests: React.FC = () => {
  const { role: currentUserRole, employee_id: currentEmployeeId } = useSelector(
    (state: RootState) => state.auth
  );

  const { showNotification } = useNotification();

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [openEdit, setOpenEdit] = useState<RequestRow | null>(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState<number | null>(null);
  const [openReject, setOpenReject] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ items: '', description: '' });

  const canCreate = currentUserRole === 'Employee' || currentUserRole === 'Manager';
  const isEmployee = currentUserRole === 'Employee';
  const isManager = currentUserRole === 'Manager';
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Superuser';

  // Column visibility - hide Approve/Reject for Employees
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    approveReject: !isEmployee,
    rejectionReason: true,
    editDelete: true,
    requesterName: true,
    items: true,
    description: true,
    status: true,
  });

  const optionalColumns = ['rejectionReason', 'editDelete'] as const;

  useEffect(() => {
    if (currentUserRole) {
      fetchRequests();
    }
  }, [currentUserRole]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests');
      // Filter invalid rows
      const valid = (res.data || []).filter(
        (item: any) => item && typeof item === 'object' && item.request_id != null
      );
      setRequests(valid);
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to load requests',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (isEdit = false) => {
    if (!form.items.trim() || !form.description.trim()) {
      showNotification('Items and description are required', 'error');
      return;
    }

    try {
      if (isEdit && openEdit?.request_id) {
        await api.put(`/requests/${openEdit.request_id}`, form);
        showNotification('Request updated successfully', 'success');
        setOpenEdit(null);
      } else {
        await api.post('/requests', form);
        showNotification('Request submitted successfully', 'success');
        setOpenForm(false);
      }

      setForm({ items: '', description: '' });
      fetchRequests();
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'submit'} request`,
        'error'
      );
    }
  };

  const handleEdit = (row: RequestRow) => {
    if (!row?.request_id) return;
    setForm({
      items: row.items || '',
      description: row.description || '',
    });
    setOpenEdit(row);
  };

  const handleDelete = (id: number | undefined) => {
    if (id == null) return;
    setOpenDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (openDeleteConfirm == null) return;

    try {
      await api.delete(`/requests/${openDeleteConfirm}`);
      showNotification('Request deleted successfully', 'success');
      fetchRequests();
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to delete request',
        'error'
      );
    } finally {
      setOpenDeleteConfirm(null);
    }
  };

  const handleAction = async (
    id: number | undefined,
    action: 'approve' | 'reject',
    isAdminAction = false
  ) => {
    if (id == null) return;

    if (action === 'reject') {
      setOpenReject(id);
      return;
    }

    const prefix = isAdminAction ? 'admin' : 'manager';

    try {
      await api.put(`/requests/${id}/${prefix}/${action}`);
      showNotification(`Request ${action}d successfully`, 'success');
      fetchRequests();
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || `Failed to ${action} request`,
        'error'
      );
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      showNotification('Rejection reason is required', 'error');
      return;
    }

    if (openReject == null) return;

    const prefix = isAdmin ? 'admin' : 'manager';

    try {
      await api.put(`/requests/${openReject}/${prefix}/reject`, {
        reason: rejectReason.trim(),
      });
      showNotification('Request rejected successfully', 'success');
      setOpenReject(null);
      setRejectReason('');
      fetchRequests();
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to reject request',
        'error'
      );
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Approved': return '#4caf50';
      case 'Rejected': return '#f44336';
      case 'Pending Admin': return '#ff9800';
      case 'Pending Manager': return '#2196f3';
      default: return '#757575';
    }
  };

  if (!currentUserRole) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Please log in to view requests
        </Typography>
      </Box>
    );
  }

  const columns: GridColDef[] = [
    {
      field: 'requesterName',
      headerName: 'Requester',
      flex: 1,
      minWidth: 220,
      valueGetter: (params) => {
        const row = params.row;
        const requester = row?.Requester ?? row?.requester;
        if (!requester) return '—';

        const employee = requester?.Employee ?? requester?.employee;
        const firstName = employee?.first_name ?? '';
        const lastName = employee?.last_name ?? '';
        const fullName = `${firstName} ${lastName}`.trim();

        return fullName || requester.username || requester.email || 'Unknown User';
      },
    },
    {
      field: 'items',
      headerName: 'Items',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 300,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      valueGetter: (params) => params.row?.status ?? '—',
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor: getStatusColor(params.value),
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 12,
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'rejectionReason',
      headerName: 'Rejection Reason',
      flex: 1.5,
      minWidth: 400,
      sortable: false,
      valueGetter: (params) => {
        const row = params.row;
        if (row?.status !== 'Rejected') return '—';
        return row?.manager_reason || row?.admin_reason || 'No reason provided';
      },
      renderCell: (params) => {
        const reason = params.value as string;
        if (reason === '—') return reason;

        return (
          <Tooltip title={reason}>
            <Typography
              variant="body2"
              color="error"
              sx={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}
            >
              {reason}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: 'editDelete',
      headerName: 'Edit / Delete',
      width: 140,
      sortable: false,
      renderCell: (params) => {
        const r = params.row;
        if (!r) return null;

        const isPendingManager = r.status === 'Pending Manager';
        const isPendingAdmin   = r.status === 'Pending Admin';

        const isCreator = r.requester_id === currentEmployeeId;

        const canEditDelete =
          isAdmin ||
          (isEmployee && isPendingManager) ||
          (isManager && isPendingAdmin);

        if (!canEditDelete) return null;

        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => handleEdit(r)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => handleDelete(r.request_id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'approveReject',
      headerName: 'Approve / Reject',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const r = params.row;
        if (!r) return null;

        const isPendingManager = r.status === 'Pending Manager';
        const isPendingAdmin   = r.status === 'Pending Admin';

        const isCreator = r.requester_id === currentEmployeeId;

        const showManagerActions = isManager && isPendingManager && !isCreator;
        const showAdminActions   = isAdmin && isPendingAdmin;

        if (!showManagerActions && !showAdminActions) return null;

        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(showManagerActions || showAdminActions) && (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    color="success"
                    onClick={() => handleAction(r.request_id, 'approve', showAdminActions)}
                  >
                    <ApproveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton
                    color="error"
                    onClick={() => handleAction(r.request_id, 'reject', showAdminActions)}
                  >
                    <RejectIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Requests</Typography>
        {canCreate && (
          <Button
            variant="contained"
            onClick={() => setOpenForm(true)}
          >
            New Request
          </Button>
        )}
      </Box>

      <Box sx={{ width: '100%', overflowX: 'auto', maxWidth: '100%' }}>
        <Box sx={{ minWidth: 1200 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={requests}
              columns={columns}
              getRowId={(row) => row?.request_id ?? Math.random()}
              autoHeight
              pageSizeOptions={[10, 25, 50, 100]}
              pagination
              slots={{
                toolbar: () => (
                  <CustomToolbar
                    columnVisibilityModel={columnVisibilityModel}
                    setColumnVisibilityModel={setColumnVisibilityModel}
                    optionalColumns={['rejectionReason', 'editDelete', 'approveReject']}
                  />
                ),
              }}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
              disableColumnMenu
              sx={dataGridHeader}
            />
          )}
        </Box>
      </Box>

      {/* Create Request Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>New Resource / Item Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Items (e.g. mouse, keyboard, tissue paper, etc.)"
            fullWidth
            multiline
            rows={3}
            value={form.items}
            onChange={(e) => setForm({ ...form, items: e.target.value })}
            margin="normal"
            required
            placeholder="You can list multiple items separated by commas"
          />
          <TextField
            label="Description / Reason for request"
            fullWidth
            multiline
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSubmit(false)}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} maxWidth="md" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>Edit Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Items"
            fullWidth
            multiline
            rows={3}
            value={form.items}
            onChange={(e) => setForm({ ...form, items: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            label="Description / Reason"
            fullWidth
            multiline
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSubmit(true)}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={openDeleteConfirm !== null} onClose={() => setOpenDeleteConfirm(null)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={openReject !== null} onClose={() => setOpenReject(null)} maxWidth="md" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason for rejection"
            fullWidth
            multiline
            rows={8}
            minRows={8}
            maxRows={12}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            margin="dense"
            required
            placeholder="Please explain in detail why this request is being rejected..."
            sx={{
              '& .MuiInputBase-root': {
                height: 'auto',
                minHeight: '180px',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenReject(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRejectSubmit}>
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Requests;
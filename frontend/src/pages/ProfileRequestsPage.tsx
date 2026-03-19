import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  DoneAll as FinalApproveIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';
import {
  pageContainer,
  headerSection,
  dialogOuterPadding,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';

interface RootState {
  auth: {
    employee_id: number;
    role: string;
  };
}

interface ProfileEditRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  requested_changes: Record<string, any>;
  changes_submitted?: Record<string, any>;
  current_data?: Record<string, any>;
  status: string;
  created_at: string;
  token_expires_at?: string | null;
  hr_comment?: string | null;
  final_comment?: string | null;
}

const ProfileRequestsReviewPage: React.FC = () => {
  const { role: currentUserRole } = useSelector((state: RootState) => state.auth);
  const { showNotification } = useNotification();

  const [requests, setRequests] = useState<ProfileEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProfileEditRequest | null>(null);
  const [actionType, setActionType] = useState<
    'approve-initial' | 'reject-initial' | 'approve-final' | 'reject-final' | null
  >(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const isHR = currentUserRole === 'HR';
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Superuser';

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    employee: true,
    status: true,
    requested_changes: true,
    submitted_changes: true,
    created_at: true,
    token_expires_at: true,
    actions: true,
  });

  const optionalColumns = ['submitted_changes', 'token_expires_at'] as const;

  useEffect(() => {
    if (currentUserRole) {
      fetchRequests();
    }
  }, [currentUserRole]);

  const fetchRequests = async () => {
    if (!isHR && !isAdmin) {
      setError('You do not have permission to view profile edit requests.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = '/profile/profile-requests/view';

      if (isAdmin) url += '?initiator=hr';
      else if (isHR) url += '?initiator=employee';

      const response = await api.get(url);
      setRequests(response.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load profile edit requests';
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (
    request: ProfileEditRequest,
    type: 'approve-initial' | 'reject-initial' | 'approve-final' | 'reject-final'
  ) => {
    setSelectedRequest(request);
    setActionType(type);
    setComment('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    setActionType(null);
    setComment('');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);

    try {
      const isApproval = actionType.includes('approve');
      const payload = isApproval ? {} : { comment: comment.trim() || null };

      let endpoint = '';
      if (actionType === 'approve-initial' || actionType === 'reject-initial') {
        endpoint = `/profile/profile-request/${selectedRequest.id}/initial-review`;
      } else {
        endpoint = `/profile/profile-request/${selectedRequest.id}/final`;
      }

      const action = actionType.includes('approve') ? 'approve' : 'reject';

      await api.put(endpoint, { ...payload, action });

      showNotification('Action completed successfully', 'success');
      await fetchRequests();
      handleCloseDialog();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to process request';
      showNotification(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'success' | 'info' | 'error' | 'warning' = 'default';
    let label = status.replace(/_/g, ' ');

    switch (status) {
      case 'pending_initial':
        color = 'warning';
        label = 'Awaiting Initial Review';
        break;
      case 'approved_initial':
        color = 'primary';
        label = 'Edit Link Sent';
        break;
      case 'pending_final':
        color = 'info';
        label = 'Awaiting Final Approval';
        break;
      case 'approved_final':
        color = 'success';
        label = 'Approved & Applied';
        break;
      case 'rejected':
        color = 'error';
        label = 'Rejected';
        break;
      default:
        label = status || 'Unknown';
    }

    return <Chip size="small" color={color} label={label} variant="filled" />;
  };

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const renderPreviousData = (request: ProfileEditRequest) => {
    if (!request.current_data || Object.keys(request.current_data).length === 0) return '—';

    return (
      <Box sx={{ maxWidth: 340, fontSize: '0.875rem' }}>
        {Object.entries(request.current_data).map(([key, value]) => (
          <Box key={key} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" component="span">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
            </Typography>{' '}
            <span>{request.current_data?.[key] ?? '—'}</span>
          </Box>
        ))}
      </Box>
    );
  };

  const renderChanges = (changes?: Record<string, any>) => {
    if (!changes || Object.keys(changes).length === 0) return '—';

    return (
      <Box sx={{ maxWidth: 340, fontSize: '0.875rem' }}>
        {Object.entries(changes).map(([key, value]) => (
          <Box key={key} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" component="span">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
            </Typography>{' '}
            <span>{value ?? '—'}</span>
          </Box>
        ))}
      </Box>
    );
  };

  const columns: GridColDef[] = [
    {
      field: 'employee',
      headerName: 'Employee',
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => params.row.employee_name || `ID: ${params.row.employee_id}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.row.status),
    },
    {
      field: 'requested_changes',
      headerName: 'Previous Data',
      flex: 1.4,
      minWidth: 220,
      renderCell: (params) => renderPreviousData(params.row),
    },
    {
      field: 'submitted_changes',
      headerName: 'Submitted Changes',
      flex: 1.4,
      minWidth: 280,
      maxWidth: 460,
      renderCell: (params) =>
        params.row.changes_submitted && Object.keys(params.row.changes_submitted).length > 0
          ? renderChanges(params.row.changes_submitted)
          : '—',
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 160,
      valueGetter: (params) => formatDate(params.row.created_at),
    },
    {
      field: 'token_expires_at',
      headerName: 'Link Expires',
      width: 160,
      valueGetter: (params) => formatDate(params.row.token_expires_at),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const req = params.row as ProfileEditRequest;

        if (req.status === 'pending_initial') {
          return (
            <>
              <Tooltip title="Approve – Send edit link">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleOpenDialog(req, 'approve-initial')}
                  disabled={processing}
                >
                  <ApproveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleOpenDialog(req, 'reject-initial')}
                  disabled={processing}
                >
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          );
        }

        if (req.status === 'pending_final') {
          return (
            <>
              <Tooltip title="Final Approve – Apply changes">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleOpenDialog(req, 'approve-final')}
                  disabled={processing}
                >
                  <FinalApproveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Final Reject">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleOpenDialog(req, 'reject-final')}
                  disabled={processing}
                >
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          );
        }

        if (req.status === 'approved_final' || req.status === 'rejected') {
          return (
            <Typography variant="caption" color="text.secondary">
              Completed
            </Typography>
          );
        }

        return null;
      },
    },
  ];

  const pageTitle = isAdmin
    ? 'All HR-Initiated Profile Update Requests'
    : isHR
    ? 'All Employee-Initiated Profile Update Requests'
    : 'Profile Requests';

  if (!isHR && !isAdmin) {
    return (
      <Box sx={pageContainer}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ ...pageContainer, display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isApproval = actionType?.includes('approve');
  const isRejection = actionType?.includes('reject');

  return (
    <Box sx={pageContainer}>
      <Box sx={{ width: '100%', maxWidth: '100%', mx: 0 }}>
        <Box sx={headerSection}>
          <Typography variant="h4">{pageTitle}</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {requests.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No profile update requests found matching your role filter.
          </Alert>
        ) : (
          <Box sx={{ minWidth: 1200, width: '100%' }}>
            <DataGrid
              rows={requests}
              columns={columns}
              getRowId={(row) => row.id}
              autoHeight
              getRowHeight={() => 'auto'}
              pageSizeOptions={[10, 25, 50, 100]}
              pagination
              loading={loading}
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
              disableColumnMenu
              sx={{
                ...dataGridHeader,
                '& .MuiDataGrid-cell': {
                  alignItems: 'flex-start',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        sx={dialogOuterPadding}
      >
        <DialogTitle>{isApproval ? 'Approve' : 'Reject'} Request</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3, whiteSpace: 'pre-line' }}>
            {actionType === 'approve-initial' &&
              'Approving sends a secure edit link to the requester.\nThey can then submit final changes.'}
            {actionType === 'reject-initial' &&
              'Rejecting notifies the requester.\nA reason is recommended.'}
            {actionType === 'approve-final' && 'Final approval applies the changes immediately.'}
            {actionType === 'reject-final' &&
              'Final rejection notifies the requester.\nA reason is recommended.'}
          </DialogContentText>

          {isRejection && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comment / Reason (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Reason for rejection (requester will see this)"
              variant="outlined"
              disabled={processing}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={isApproval ? 'success' : 'error'}
            startIcon={processing ? <CircularProgress size={20} /> : null}
            disabled={processing}
            onClick={handleConfirmAction}
          >
            {processing ? 'Processing...' : isApproval ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileRequestsReviewPage;
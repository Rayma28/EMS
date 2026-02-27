import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tooltip,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  DoneAll as FinalApproveIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';

interface RootState {
  auth: {
    employee_id: number;
    role: string;
  };
}

interface ProfileEditRequest {
  id: number | string;
  employee_id: number;
  employee_name: string;
  requested_changes: Record<string, any>;
  changes_submitted?: Record<string, any>;
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

      if (isAdmin) {
        url += '?initiator=hr';
      } else if (isHR) {
        url += '?initiator=employee';
      }

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
      const payload = { comment: comment.trim() || null };
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
        color = 'default';
        label = status || 'Unknown';
    }

    return <Chip size="small" color={color} label={label} variant="filled" />;
  };

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const renderChanges = (changes?: Record<string, any>) => {
    if (!changes || Object.keys(changes).length === 0) {
      return <Typography variant="body2" color="text.secondary">—</Typography>;
    }

    return (
      <Stack spacing={0.5} sx={{ maxWidth: 360 }}>
        {Object.entries(changes).map(([key, value]) => (
          <Box key={key}>
            <Typography variant="caption" color="text.secondary" component="span">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
            </Typography>{' '}
            <Typography variant="body2" component="span">
              {value ?? '—'}
            </Typography>
          </Box>
        ))}
      </Stack>
    );
  };

  const pageTitle = isAdmin
    ? 'All HR-Initiated Profile Update Requests'
    : isHR
    ? 'All Employee-Initiated Profile Update Requests'
    : 'Profile Requests';

  if (!isHR && !isAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          You do not have permission to view this page.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', py: 6, px: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {pageTitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No profile update requests found matching your role filter.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 4, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Requested Changes</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Submitted Changes</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Link Expires</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {req.employee_name || `ID: ${req.employee_id}`}
                    </Typography>
                  </TableCell>

                  <TableCell>{getStatusChip(req.status)}</TableCell>

                  <TableCell>{renderChanges(req.requested_changes)}</TableCell>

                  <TableCell>
                    {req.changes_submitted && Object.keys(req.changes_submitted).length > 0
                      ? renderChanges(req.changes_submitted)
                      : '—'}
                  </TableCell>

                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>{formatDate(req.token_expires_at)}</TableCell>

                  <TableCell align="right">
                    {req.status === 'pending_initial' && (
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
                    )}

                    {req.status === 'pending_final' && (
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
                    )}

                    {(req.status === 'approved_final' || req.status === 'rejected') && (
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType?.includes('approve') ? 'Approve' : 'Reject'} Request
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3, whiteSpace: 'pre-line' }}>
            {actionType === 'approve-initial' &&
              'Approving sends a secure edit link to the requester.\nThey can then submit final changes.'}
            {actionType === 'reject-initial' &&
              'Rejecting notifies the requester.\nA reason is recommended.'}
            {actionType === 'approve-final' &&
              'Final approval applies the changes immediately.'}
            {actionType === 'reject-final' &&
              'Final rejection notifies the requester.\nA reason is recommended.'}
          </DialogContentText>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment / Reason (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              actionType?.includes('reject')
                ? 'Reason for rejection (requester will see this)'
                : 'Optional note...'
            }
            variant="outlined"
            disabled={processing}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionType?.includes('approve') ? 'success' : 'error'}
            startIcon={processing ? <CircularProgress size={20} /> : null}
            disabled={processing}
            onClick={handleConfirmAction}
          >
            {processing ? 'Processing...' : actionType?.includes('approve') ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileRequestsReviewPage;
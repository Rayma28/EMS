// src/pages/HRProfileRequestsPage.tsx

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
  Stack,
  Button,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';

interface ProfileEditRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  requested_changes: Record<string, string | null>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  expires_at: string;
  comment?: string | null;
}

const HRProfileRequestsPage: React.FC = () => {
  const { showNotification } = useNotification();

  const [requests, setRequests] = useState<ProfileEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProfileEditRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/profile/profile-requests/pending');

      setRequests(response.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load profile edit requests';
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (request: ProfileEditRequest, type: 'approve' | 'reject') => {
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

      let url = '';
      if (actionType === 'approve') {
        url = `/profile/profile-requests/${selectedRequest.id}/approve`;
      } else {
        url = `/profile/profile-requests/${selectedRequest.id}/reject`;
      }

      await api.post(url, payload);

      showNotification(
        `Request ${actionType}d successfully`,
        'success'
      );

      // Refresh list
      await fetchRequests();
      handleCloseDialog();
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to ${actionType} request`;
      showNotification(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const renderChanges = (changes: Record<string, string | null>) => {
    return (
      <Stack spacing={0.5} sx={{ maxWidth: 340 }}>
        {Object.entries(changes).map(([key, value]) => (
          <Box key={key}>
            <Typography variant="caption" color="text.secondary" component="span">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
            </Typography>{' '}
            <Typography variant="body2" component="span">
              {value || '—'}
            </Typography>
          </Box>
        ))}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', py: 6, px: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Profile Edit Requests (HR)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No pending profile edit requests at the moment.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 4 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Changes Requested</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Requested At</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Expires At</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">
                        {req.employee_name || `Employee #${req.employee_id}`}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>{renderChanges(req.requested_changes)}</TableCell>

                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>{formatDate(req.expires_at)}</TableCell>

                  <TableCell align="right">
                    <Tooltip title="Approve">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenDialog(req, 'approve')}
                        disabled={processing}
                      >
                        <ApproveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Reject">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDialog(req, 'reject')}
                        disabled={processing}
                      >
                        <RejectIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Approve / Reject Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve' : 'Reject'} Profile Edit Request
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            {actionType === 'approve'
              ? 'Approving will apply the requested changes to the employee’s profile.'
              : 'Rejecting will notify the employee (comment is optional but recommended).'}
          </DialogContentText>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              actionType === 'reject'
                ? 'Reason for rejection (will be visible to the employee)...'
                : 'Internal note or message...'
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
            color={actionType === 'approve' ? 'success' : 'error'}
            startIcon={processing ? <CircularProgress size={20} /> : null}
            disabled={processing}
            onClick={handleConfirmAction}
          >
            {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRProfileRequestsPage;
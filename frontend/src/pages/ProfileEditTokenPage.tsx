import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';

const ProfileEditTokenPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, any>>({});
  const [changes, setChanges] = useState<Record<string, string | null>>({});
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing secure link');
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        const res = await api.get(`/profile/profile/edit/${token}`);

        if (!res.data.success) {
          setError(res.data.message || 'This link is invalid or has expired');
          return;
        }

        setCurrentData(res.data.current || {});
        setChanges(res.data.requested || res.data.current || {});
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            'Failed to load profile information. The link may be invalid or expired.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setChanges((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);

    try {
      const res = await api.put(`/profile/profile/edit/${token}`, { changes });

      if (res.data.success) {
        setSuccess(true);
        showNotification(
          'Changes submitted successfully! Waiting for final HR approval.',
          'success'
        );
        // Give user more time to read the message
        setTimeout(() => navigate('/profile'), 4500);
      } else {
        setError(res.data.message || 'Failed to submit changes');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'An error occurred while submitting your changes. Please try again.';
      setError(msg);
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 8, px: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Typography variant="body1" paragraph>
          The secure link may have expired, already been used, or is invalid.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please return to your profile and request a new edit link if needed.
        </Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 10, px: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 4, fontSize: '1.1rem' }}>
          Your changes have been successfully submitted!
        </Alert>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          HR will review your updates shortly.
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You will receive an email once a final decision has been made.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Redirecting you to your profile page...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: 6, px: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Edit Your Personal Information
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        HR has pre-approved your request. Please review and update the fields below.
        <br />
        <strong>After submission, HR will perform a final review before applying the changes.</strong>
      </Alert>

      <Card elevation={3}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Grid container spacing={3}>
            {[
              'first_name',
              'last_name',
              'email',
              'phone',
              'dob',
              'gender',
              'pan_number',
              'aadhaar_number',
            ].map((field) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  fullWidth
                  label={
                    field === 'first_name'
                      ? 'First Name'
                      : field === 'last_name'
                      ? 'Last Name'
                      : field === 'email'
                      ? 'Email Address'
                      : field === 'phone'
                      ? 'Phone Number'
                      : field === 'dob'
                      ? 'Date of Birth'
                      : field === 'gender'
                      ? 'Gender'
                      : field === 'pan_number'
                      ? 'PAN Number'
                      : 'Aadhaar Number'
                  }
                  name={field}
                  value={changes[field] ?? currentData[field] ?? ''}
                  onChange={handleChange}
                  variant="outlined"
                  type={field === 'dob' ? 'date' : 'text'}
                  InputLabelProps={field === 'dob' ? { shrink: true } : undefined}
                  helperText={
                    field === 'email'
                      ? 'Email changes are highly sensitive — contact HR if needed'
                      : field === 'aadhaar_number' || field === 'pan_number'
                      ? 'Ensure accuracy — changes require final HR approval'
                      : undefined
                  }
                  disabled={submitting}
                />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate('/profile')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting ? 'Submitting...' : 'Submit for Final Approval'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to submit these changes?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            After submission, HR will perform a final review before any updates are applied to your profile.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitting}
            autoFocus
          >
            {submitting ? 'Submitting...' : 'Yes, Submit Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileEditTokenPage;
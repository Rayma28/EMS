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
  const [currentData, setCurrentData] = useState<any>(null);
  const [changes, setChanges] = useState<any>({});
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await api.get(`/profile-edit/${token}`);
        if (!res.data.success) {
          setError(res.data.message || 'Invalid or expired link');
        } else {
          setCurrentData(res.data.current);
          setChanges(res.data.requested || {});
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load edit request');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setChanges((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);

    try {
      const res = await api.put(`/profile-edit/${token}`, { changes });
      if (res.data.success) {
        setSuccess(true);
        showNotification('Profile updated successfully!', 'success');
        setTimeout(() => navigate('/profile'), 3002); 
      } else {
        setError(res.data.message || 'Update failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
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
        <Typography variant="body1">
          Please contact HR or request a new edit link.
        </Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 8, px: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 4 }}>
          Your profile has been updated successfully!
        </Alert>
        <Typography variant="h6" gutterBottom>
          Redirecting you to your profile page...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 6, px: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Update Your Profile
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Review and make changes to the requested fields below. Click "Submit Changes" when ready.
      </Typography>

      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            {['first_name', 'last_name', 'email', 'phone', 'dob', 'gender', 'pan_number', 'aadhaar_number'].map((field) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  fullWidth
                  label={
                    field === 'first_name' ? 'First Name' :
                    field === 'last_name' ? 'Last Name' :
                    field === 'email' ? 'Email' :
                    field === 'phone' ? 'Phone Number' :
                    field === 'dob' ? 'Date of Birth' :
                    field === 'gender' ? 'Gender' :
                    field === 'pan_number' ? 'PAN Number' :
                    'Aadhaar Number'
                  }
                  name={field}
                  value={changes[field] ?? currentData?.[field] ?? ''}
                  onChange={handleChange}
                  variant="outlined"
                  type={field === 'dob' ? 'date' : 'text'}
                  InputLabelProps={field === 'dob' ? { shrink: true } : undefined}
                  helperText={field === 'email' ? 'Email changes are sensitive' : undefined}
                />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 5, textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting ? 'Submitting...' : 'Submit Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Profile Update</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to apply these changes to your profile?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} autoFocus>
            Yes, Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileEditTokenPage;
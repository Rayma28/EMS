import React, { useState, useEffect, useMemo } from 'react';
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
import dayjs from 'dayjs';

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

  // Validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentYear = new Date().getFullYear();
  const MIN_AGE = 18;
  const MAX_AGE = 65;

  const minDob = useMemo(() => `${currentYear - MAX_AGE}-01-01`, [currentYear]);
  const maxDob = useMemo(() => `${currentYear - MIN_AGE}-12-31`, [currentYear]);

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

  // Real-time input sanitization + basic live validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    // Real-time cleaning
    if (name === 'first_name' || name === 'last_name') {
      sanitized = value.replace(/[^A-Za-z]/g, '');
    } else if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pan_number') {
      sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (name === 'aadhaar_number') {
      sanitized = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'email') {
      // Allow typical email characters — no aggressive sanitization here
      sanitized = value.trim();
    }

    setChanges((prev) => ({ ...prev, [name]: sanitized || null }));

    // Live validation feedback
    const newErrors = { ...fieldErrors };

    if (name === 'first_name' || name === 'last_name') {
      if (sanitized.length === 0) {
        newErrors[name] = 'This field is required';
      } else if (sanitized.length < 2) {
        newErrors[name] = 'Minimum 2 characters';
      } else {
        delete newErrors[name];
      }
    }

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!sanitized) {
        newErrors[name] = 'Email is required';
      } else if (!emailRegex.test(sanitized)) {
        newErrors[name] = 'Please enter a valid email address';
      } else {
        delete newErrors[name];
      }
    }

    if (name === 'phone' && sanitized.length > 0 && sanitized.length !== 10) {
      newErrors[name] = 'Phone must be 10 digits';
    } else if (name === 'phone') {
      delete newErrors[name];
    }

    if (name === 'dob' && sanitized) {
      const dobYear = Number(sanitized.split('-')[0]);
      if (dobYear < currentYear - MAX_AGE || dobYear > currentYear - MIN_AGE) {
        newErrors[name] = `Age must be between ${MIN_AGE} and ${MAX_AGE} years`;
      } else {
        delete newErrors[name];
      }
    }

    if (name === 'pan_number' && sanitized.length > 0 && sanitized.length !== 10) {
      newErrors[name] = 'PAN must be 10 characters';
    } else if (name === 'pan_number') {
      delete newErrors[name];
    }

    if (name === 'aadhaar_number' && sanitized.length > 0 && sanitized.length !== 12) {
      newErrors[name] = 'Aadhaar must be 12 digits';
    } else if (name === 'aadhaar_number') {
      delete newErrors[name];
    }

    setFieldErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!changes.first_name?.trim()) errors.first_name = 'First Name is required';
    if (!changes.last_name?.trim()) errors.last_name = 'Last Name is required';
    if (!changes.email?.trim()) errors.email = 'Email is required';

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (changes.email && !emailRegex.test(changes.email)) {
      errors.email = 'Invalid email format';
    }

    // Names
    const nameRegex = /^[A-Za-z]+$/;
    if (changes.first_name && !nameRegex.test(changes.first_name)) {
      errors.first_name = 'Only alphabets allowed';
    }
    if (changes.last_name && !nameRegex.test(changes.last_name)) {
      errors.last_name = 'Only alphabets allowed';
    }

    // Phone (optional but if filled → must be valid)
    if (changes.phone && (changes.phone.length !== 10 || !/^\d{10}$/.test(changes.phone))) {
      errors.phone = 'Phone must be exactly 10 digits';
    }

    // DOB
    if (changes.dob) {
      const dobDate = dayjs(changes.dob);
      const age = dayjs().diff(dobDate, 'year');
      if (age < MIN_AGE || age > MAX_AGE) {
        errors.dob = `Age must be between ${MIN_AGE} and ${MAX_AGE} years`;
      }
    }

    // PAN (if provided)
    if (changes.pan_number && changes.pan_number.length !== 10) {
      errors.pan_number = 'PAN must be 10 characters';
    }

    // Aadhaar (if provided)
    if (changes.aadhaar_number && changes.aadhaar_number.length !== 12) {
      errors.aadhaar_number = 'Aadhaar must be 12 digits';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      showNotification('Please correct the errors in the form', 'error');
      return false;
    }

    return true;
  };

  const handleSubmitClick = () => {
    if (validateForm()) {
      setConfirmOpen(true);
    }
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
                  required={field === 'first_name' || field === 'last_name' || field === 'email'}
                  label={
                    field === 'first_name' ? 'First Name' :
                    field === 'last_name' ? 'Last Name' :
                    field === 'email' ? 'Email Address' :
                    field === 'phone' ? 'Phone Number' :
                    field === 'dob' ? 'Date of Birth' :
                    field === 'gender' ? 'Gender' :
                    field === 'pan_number' ? 'PAN Number' :
                    'Aadhaar Number'
                  }
                  name={field}
                  value={changes[field] ?? currentData[field] ?? ''}
                  onChange={handleChange}
                  variant="outlined"
                  type={field === 'dob' ? 'date' : 'text'}
                  InputLabelProps={field === 'dob' ? { shrink: true } : undefined}
                  error={!!fieldErrors[field]}
                  helperText={
                    fieldErrors[field] ||
                    (field === 'email' ? 'This will be your new login email — use carefully' :
                     field === 'aadhaar_number' || field === 'pan_number'
                       ? 'Ensure accuracy — changes require final HR approval'
                       : field === 'phone' ? '10-digit mobile number'
                       : undefined)
                  }
                  disabled={submitting}
                  InputProps={{
                    ...(field === 'dob' ? { inputProps: { min: minDob, max: maxDob } } : {}),
                  }}
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
              onClick={handleSubmitClick}
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
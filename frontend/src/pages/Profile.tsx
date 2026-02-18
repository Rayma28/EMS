import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';
const STATIC_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, ''); // e.g. http://localhost:5002

interface Profile {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  dob: string | null;
  gender: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  joining_date: string | null;
  department_name: string;
  designation: string | null;
  status: string;
  documents: string[];
  profile_picture?: string | null;
}

const ProfilePage: React.FC = () => {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<Profile>>({});
  const [isEditingNonSensitive, setIsEditingNonSensitive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Request modal state
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const [requestData, setRequestData] = useState<Partial<Profile>>({});
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      const data = res.data || {};

      // Normalize paths → keep only from "uploads/" onward
      let documents: string[] = [];
      if (Array.isArray(data.documents)) {
        documents = data.documents.map((p: string) =>
          p.replace(/^.*[\/\\]uploads[\/\\]?/i, 'uploads/')
        );
      } else if (typeof data.documents === 'string' && data.documents.trim()) {
        try {
          const parsed = JSON.parse(data.documents);
          documents = Array.isArray(parsed)
            ? parsed.map((p: string) => p.replace(/^.*[\/\\]uploads[\/\\]?/i, 'uploads/'))
            : [];
        } catch {}
      }

      const formatted: Profile = {
        employee_id: Number(data.employee_id) || 0,
        first_name: String(data.first_name || ''),
        last_name: String(data.last_name || ''),
        email: String(data.email || ''),
        phone: data.phone ?? null,
        address: data.address ?? null,
        dob: data.dob ?? null,
        gender: data.gender ?? null,
        pan_number: data.pan_number ?? null,
        aadhaar_number: data.aadhaar_number ?? null,
        joining_date: data.joining_date ?? null,
        department_name: String(data.department || 'Not assigned'),
        designation: data.designation ?? null,
        status: String(data.status || 'Active'),
        documents,
        profile_picture: data.profile_picture
          ? data.profile_picture.replace(/^.*[\/\\]uploads[\/\\]?/i, 'uploads/')
          : null,
      };

      setProfile(formatted);
      setEditProfile({});
      setRequestData({});
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to load profile',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Non-sensitive (address) edit ───
  const handleNonSensitiveEditToggle = () => {
    if (isEditingNonSensitive) {
      setEditProfile({});
    } else if (profile) {
      setEditProfile({ address: profile.address });
    }
    setIsEditingNonSensitive(!isEditingNonSensitive);
  };

  const handleNonSensitiveSave = async () => {
    if (!profile) return;
    try {
      const payload = {
        address: editProfile.address ?? profile.address,
      };
      await api.put('/profile', payload);
      showNotification('Address updated successfully', 'success');
      setIsEditingNonSensitive(false);
      setEditProfile({});
      await loadProfile();
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to update address',
        'error'
      );
    }
  };

  // ─── Request sensitive fields (read-only confirmation) ───
  const handleOpenRequestModal = () => {
    if (profile) {
      setRequestData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        gender: profile.gender || '',
        dob: profile.dob || '',
        pan_number: profile.pan_number || '',
        aadhaar_number: profile.aadhaar_number || '',
      });
    }
    setOpenRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!profile) return;
    setRequestLoading(true);
    try {
      const payload = {
        changes: requestData,
      };

      await api.post('/profile/profile-request', payload);

      showNotification(
        'Request sent successfully. Check your email for the secure edit link.',
        'success'
      );
      setOpenRequestModal(false);
      setRequestData({});
    } catch (err: any) {
      showNotification(
        err.response?.data?.message || 'Failed to send request. Please try again.',
        'error'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleInputChangeNonSensitive = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !profile) return;
    setUploadingPhoto(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('profile_picture', file);
    try {
      await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showNotification('Profile picture updated successfully', 'success');
      await loadProfile();
    } catch (err: any) {
      showNotification('Failed to upload profile picture', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleUploadDocuments = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !profile) return;
    setUploadingDoc(true);
    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append('documents', file);
    });
    try {
      await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showNotification('Document(s) uploaded successfully', 'success');
      await loadProfile();
    } catch (err: any) {
      showNotification('Document upload failed', 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (filePath: string) => {
    if (!profile || !window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.put('/profile', { remove_document: filePath });
      showNotification('Document deleted successfully', 'success');
      await loadProfile();
    } catch (err: any) {
      showNotification('Failed to delete document', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return <Alert severity="error">Profile not found</Alert>;
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || 'Employee';

  const avatarSrc = profile.profile_picture
    ? `${STATIC_BASE_URL}/${profile.profile_picture.replace(/^\//, '')}`
    : undefined;

  const previewBase = STATIC_BASE_URL;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4, px: { xs: 2, md: 4 } }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={5}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" component="h1" fontWeight={700}>
          My Profile
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleOpenRequestModal}
          >
            Request Profile Update
          </Button>
          {!isEditingNonSensitive ? (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleNonSensitiveEditToggle}
            >
              Edit Address
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={handleNonSensitiveEditToggle}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleNonSensitiveSave}
              >
                Save Address
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {/* Personal Information */}
      <Card elevation={4} sx={{ mb: 5, borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Grid container spacing={5}>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar
                src={avatarSrc}
                alt={fullName}
                sx={{
                  width: 160,
                  height: 160,
                  mx: 'auto',
                  mb: 3,
                  fontSize: 64,
                  bgcolor: 'primary.dark',
                  boxShadow: 3,
                }}
              >
                {!avatarSrc && fullName.charAt(0)}
              </Avatar>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {fullName}
              </Typography>
              <Chip
                icon={<PersonIcon />}
                label={profile.designation || 'Employee'}
                color="primary"
                variant="outlined"
                size="medium"
                sx={{ fontWeight: 500, mb: 2 }}
              />
              <Box mt={2}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={
                    uploadingPhoto ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <UploadIcon />
                    )
                  }
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Change Profile Photo'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleUploadPhoto}
                  />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                {/* Sensitive fields – read-only */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profile.email}
                    disabled
                    variant="outlined"
                    helperText="Email changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={profile.phone ?? ''}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profile.first_name}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profile.last_name}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="PAN Number"
                    value={profile.pan_number ?? ''}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Aadhaar Number"
                    value={profile.aadhaar_number ?? ''}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={profile.dob ?? ''}
                    disabled
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Gender"
                    value={profile.gender || 'Not specified'}
                    disabled
                    variant="outlined"
                    helperText="Changes require HR approval"
                  />
                </Grid>

                {/* Non-sensitive – editable */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Address"
                    name="address"
                    value={isEditingNonSensitive ? (editProfile.address ?? '') : (profile.address ?? '')}
                    onChange={handleInputChangeNonSensitive}
                    disabled={!isEditingNonSensitive}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card elevation={4} sx={{ mb: 5, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h6" gutterBottom fontWeight={700}>
            Employment Details
          </Typography>
          <Divider sx={{ mb: 4 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Department"
                value={profile.department_name}
                disabled
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Designation"
                value={profile.designation || '—'}
                disabled
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Joining Date"
                value={profile.joining_date || '—'}
                disabled
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Status"
                value={profile.status}
                disabled
                variant="outlined"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            mb={4}
            spacing={2}
          >
            <Typography variant="h6" fontWeight={700}>
              Documents & Certificates
            </Typography>
            <Button
              component="label"
              variant="contained"
              color="primary"
              startIcon={
                uploadingDoc ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />
              }
              disabled={uploadingDoc}
            >
              {uploadingDoc ? 'Uploading...' : 'Upload New Document'}
              <input type="file" hidden multiple onChange={handleUploadDocuments} />
            </Button>
          </Stack>

          {profile.documents.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              You haven't uploaded any documents yet.
            </Alert>
          ) : (
            <List disablePadding>
              {profile.documents.map((path, index) => {
                const filename = path.split(/[\\/]/).pop() || `document-${index + 1}`;
                const previewUrl = `${previewBase}/${path.replace(/^\//, '')}`;

                return (
                  <ListItem key={index} divider sx={{ py: 2, px: 0 }}>
                    <ListItemIcon>
                      <DescriptionIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={filename}
                      secondary={path}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        component="a"
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ mr: 1 }}
                        title="Preview document"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteDocument(path)}
                        title="Delete document"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Request Confirmation Modal */}
      <Dialog open={openRequestModal} onClose={() => setOpenRequestModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confirm Profile Update Request</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            You are about to request HR approval to update the following personal details.
            <br />
            After submitting, you will receive an email with a secure link to finalize the changes.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={requestData.first_name || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={requestData.last_name || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={requestData.email || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
                helperText="Email changes are sensitive"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={requestData.phone || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gender"
                value={requestData.gender || 'Not specified'}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={requestData.dob || ''}
                disabled
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PAN Number"
                value={requestData.pan_number || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
                placeholder="ABCDE1234F"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Aadhaar Number"
                value={requestData.aadhaar_number || ''}
                disabled
                variant="outlined"
                InputProps={{ readOnly: true }}
                placeholder="XXXX XXXX XXXX"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequestModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={requestLoading ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={requestLoading}
            onClick={handleSubmitRequest}
          >
            {requestLoading ? 'Sending...' : 'Send Request to HR'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
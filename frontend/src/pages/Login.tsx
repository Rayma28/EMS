import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  Paper,
  Container,
  Alert,
  AlertTitle,
  Slide,
  Snackbar,
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import api from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess } from '../redux/authSlice.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../redux/store.tsx';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // For session expired popup
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useSelector((state: RootState) => state.auth);

  // Check for session expired on mount
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }

    const params = new URLSearchParams(location.search);
    if (params.get('sessionExpired') === 'true') {
      setOpenSnackbar(true);
    }
  }, [token, navigate, location]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);

      dispatch(loginSuccess({
        token: res.data.token,
        role: res.data.role,
      }));

      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'ur[](https://source.unsplash.com/random/1920x1080/?office,corporate,professional)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={16}
          sx={{
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 3,
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 64, height: 64 }}>
            <LockOutlined fontSize="large" />
          </Avatar>

          <Typography component="h1" variant="h4" fontWeight="bold" gutterBottom>
            KIT SOLUTIONS EMS
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Vadodara
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
            />

            {error && (
              <Typography color="error" align="center" sx={{ mt: 2, fontWeight: 'bold' }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 4,
                mb: 2,
                py: 2,
                fontSize: '1.1rem',
                textTransform: 'none',
              }}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Session Expired Popup */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="warning" 
          variant="filled"
          sx={{ width: '100%', fontSize: '1.1rem' }}
        >
          <AlertTitle sx={{ fontWeight: 'bold' }}>Session Expired</AlertTitle>
          Your session has expired. Please log in again.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
// src/pages/Unauthorized.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleGoToLogin = () => {
    setIsLoggingOut(true);

    try {
      // Clear all auth-related storage
      localStorage.clear();
      sessionStorage.clear();

      // Small delay to show loading state
      setTimeout(() => {
        window.location.replace('/login');
      }, 400);
    } catch (err) {
      console.error('Clear storage failed:', err);
      window.location.replace('/login'); // fallback
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            width: '100%',
            maxWidth: 460,
            textAlign: 'center',
            background: theme.palette.background.paper,
          }}
        >
          <Box sx={{ mb: 3 }}>
            <SecurityIcon
              color="error"
              sx={{
                fontSize: 80,
                opacity: 0.9,
              }}
            />
          </Box>

          <Typography
            variant="h4"
            component="h1"
            fontWeight={700}
            color="error.main"
            gutterBottom
          >
            Access Denied
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 2, fontWeight: 500 }}
          >
            You don't have permission to view this page
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              lineHeight: 1.7,
              px: { xs: 1, sm: 4 },
            }}
          >
            Your account may not be linked to an employee profile yet,
            <br />
            or your current role doesn't allow access to this section.
            <br /><br />
            Please sign in again or contact your administrator.
          </Typography>

          <Divider sx={{ my: 4, opacity: 0.5 }} />

          <Button
            variant="contained"
            color="primary"
            size="large" 
            startIcon={
              isLoggingOut ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <LoginIcon />
              )
            }
            onClick={handleGoToLogin}
            disabled={isLoggingOut}
            sx={{
              py: 1.6,
              px: 6,
              fontWeight: 600,
              fontSize: '1.1rem',
              minWidth: 220,
            }}
          >
            {isLoggingOut ? 'Signing out...' : 'Go to Login'}
          </Button>

          <Box sx={{ mt: 5, pt: 3 }}>
            <Typography variant="caption" color="text.disabled">
              KIT SOLUTIONS EMS PVT LTD • {new Date().getFullYear()}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;
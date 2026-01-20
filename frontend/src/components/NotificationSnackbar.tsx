// src/components/NotificationSnackbar.tsx
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useNotification } from '../hooks/useNotification.tsx';

const NotificationSnackbar: React.FC = () => {
  const { notification, hideNotification } = useNotification();

  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={6000}
      onClose={hideNotification}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={hideNotification}
        severity={notification.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;
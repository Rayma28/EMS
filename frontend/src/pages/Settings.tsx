import React from 'react';
import { Typography, Box } from '@mui/material';

const Settings = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Typography variant="body1" color="text.secondary">
        System configuration, role management, company details 
      </Typography>

      {/* Add forms for company info, role permissions, etc. */}
    </Box>
  );
};

export default Settings;
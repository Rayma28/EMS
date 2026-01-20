import React, { useState } from 'react';
import { Box } from '@mui/material';
import Navbar from './Navbar.tsx';
import Sidebar from './Sidebar.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        mobileOpen={mobileOpen} 
        onClose={handleDrawerClose} 
      />

      {/* Main content area  */}
      <Box
        sx={{
          flexGrow: 1,                   
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',               
          overflowX: 'hidden',         
        }}
      >
        {/* Fixed Navbar */}
        <Navbar onMenuClick={handleDrawerToggle} />

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: '100%',
            p: 3,
            pt: { xs: 10, sm: 11, md: 12 }, 
            pb: 6,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import logo from '../../assets/logo.png';
import MenuIcon from '@mui/icons-material/Menu';     

interface AuthState {
  role: string;
  user: {
    name?: string;
    photo?: string;
  } | null;
}

const Navbar: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { role, user } = useSelector((state: RootState) => state.auth as unknown as AuthState);
  const displayName = user?.name || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <AppBar
      position="fixed"
      elevation={1}                    
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,   
        backdropFilter: 'blur(8px)',                   
        backgroundColor: 'rgba(25, 118, 210, 0.92)',   
      }}
    >
      <Toolbar sx={{ px: { xs: 3, sm: 4, md: 5 } }}>
        {/* Left section: Menu button (mobile) + Logo + Company Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {/* Mobile menu toggle - only visible on small screens */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo with white background pill */}
          <Box
            sx={{
              backgroundColor: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              mr: 2.5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <img
              src={logo}
              alt="KIT Solutions Logo"
              style={{ height: 42, width: 'auto' }}
            />
          </Box>

          {/* Company name */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              display: { xs: 'none', sm: 'block' },
              letterSpacing: '0.5px',
            }}
          >
            KIT SOLUTIONS EMS
          </Typography>
        </Box>

        {/* Right section: Role + Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          {/* Role badge */}
          <Box
            sx={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: '12px',
              px: 1.5,
              py: 0.5,
              display: { xs: 'none', md: 'block' }, 
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {role || 'Guest'}
            </Typography>
          </Box>

          {/* Avatar with tooltip */}
          <Tooltip title={displayName}>
            <Avatar
              src={user?.photo || undefined}
              alt={displayName}
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.main',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {avatarLetter}
            </Avatar>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
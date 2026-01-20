import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { logout } from '../../redux/authSlice.tsx';
import { getMenuItems } from '../../utils/constants';
import {
  Dashboard,
  People,
  BusinessCenter,
  AccessTime,
  EventAvailable,
  Payment,
  StarRate,
  Assessment,
  Person,
  Settings,
  Logout as LogoutIcon,
} from '@mui/icons-material';

const iconMap: Record<string, React.ReactElement> = {
  Dashboard: <Dashboard />,
  Employees: <People />,
  Departments: <BusinessCenter />,
  Attendance: <AccessTime />,
  Leaves: <EventAvailable />,
  Payroll: <Payment />,
  Performance: <StarRate />,
  Reports: <Assessment />,
  Users: <People />,
  Profile: <Person />,
  Settings: <Settings />,
};

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();

  const role = useSelector((state: RootState) => state.auth.role);
  const menuItems = getMenuItems(role);

  const handleNavigate = (text: string) => {
    if (text === 'Logout') {
      dispatch(logout());
      navigate('/login');
    } else {
      const path = text.toLowerCase() === 'dashboard' ? '/' : `/${text.toLowerCase()}`;
      navigate(path);
    }

    // Close mobile drawer after click
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isActive = (text: string): boolean => {
    const path = text.toLowerCase() === 'dashboard' ? '/' : `/${text.toLowerCase()}`;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Main menu items */}
      <List sx={{ flexGrow: 1, px: 1, pt: 2 }}>
        {menuItems.map((text) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              selected={isActive(text)}
              onClick={() => handleNavigate(text)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.main' },
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 48, color: 'text.secondary' }}>
                {iconMap[text] || <Dashboard />}
              </ListItemIcon>
              <ListItemText
                primary={text}
                primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Logout - always at the bottom */}
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigate('Logout')}
            sx={{
              borderRadius: 1.5,
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.lighter',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 48, color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      {/* Desktop - permanent sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            mt: '64px',
            height: 'calc(100% - 64px)',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile - temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
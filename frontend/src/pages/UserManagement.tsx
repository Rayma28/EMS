// src/pages/UserManagement.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';
import {
  pageContainer,
  headerSection,
  dialogGrid,
  dialogOuterPadding,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';
import { useNotification } from '../context/NotificationContext.tsx';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'HR' | 'Manager' | 'Employee';
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by?: number | null;
  updated_by?: number | null;
}

const UserManagement: React.FC = () => {
  const [rows, setRows] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Employee' as User['role'],
  });
  const [loading, setLoading] = useState(false);

  const optionalColumns = [
    'is_active',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
  ] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    username: true,
    email: true,
    role: true,
    is_active: true,
    actions: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    updated_by: true,
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      const mappedUsers = res.data.map((u: any) => ({
        id: u.id,
        username: u.username || '',
        email: u.email || '',
        role: u.role || 'Employee',
        is_active: u.is_active ?? true,
        created_at: u.created_at || '',
        updated_at: u.updated_at || null,
        created_by: u.created_by ?? null,
        updated_by: u.updated_by ?? null,
      }));

      setRows(mappedUsers);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, form);
        showNotification('User updated successfully', 'success');
      } else {
        if (!form.password) {
          showNotification('Password is required for new users', 'error');
          return;
        }
        await api.post('/users', form);
        showNotification('User created successfully', 'success');
      }

      setOpen(false);
      setEditingId(null);
      setForm({
        username: '',
        email: '',
        password: '',
        role: 'Employee',
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Save user error:', err.response?.data || err);
      showNotification(
        err.response?.data?.message || 'Failed to save user',
        'error'
      );
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
    });
    setOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/users/${selectedId}`);
      showNotification('User deleted successfully', 'success');
      fetchUsers();
    } catch (err: any) {
      console.error('Delete error:', err);
      showNotification('Failed to delete user', 'error');
    } finally {
      setDeleteOpen(false);
    }
  };

  const columns: GridColumnVisibilityModel<User>[] = [
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 240 },
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 140 },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      renderCell: (params) => (params.value ? 'Yes' : 'No'),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 170,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleString('en-IN') : '—'),
    },
    {
      field: 'updated_at',
      headerName: 'Last Update',
      width: 170,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleString('en-IN') : '—'),
    },
    {
      field: 'created_by',
      headerName: 'Created By',
      width: 140,
      valueFormatter: ({ value, row }) => {
        return row?.Creator?.username ? row.Creator.username : value ? 'SuperUser' : '—';
      },
    },
    {
      field: 'updated_by',
      headerName: 'Updated By',
      width: 140,
      valueFormatter: ({ value, row }) => {
        return row?.Updater?.username ? row.Updater.username : value ? 'SuperUser' : '—';
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              color="error"
              onClick={() => handleDeleteClick(params.row.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEditingId(null);
            setForm({
              username: '',
              email: '',
              password: '',
              role: 'Employee',
            });
            setOpen(true);
          }}
        >
          Add New User
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          pageSizeOptions={[5, 10, 25, 50, 100]}
          pagination
          getRowId={(row) => row.id}
          slots={{
            toolbar: () => (
              <CustomToolbar
                columnVisibilityModel={columnVisibilityModel}
                setColumnVisibilityModel={setColumnVisibilityModel}
                optionalColumns={optionalColumns}
              />
            ),
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
          disableColumnMenu 
          sx={dataGridHeader}
        />
      </Box>

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>{editingId ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box sx={dialogGrid}>
            <TextField
              autoFocus
              margin="dense"
              label="Username"
              fullWidth
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              margin="dense"
              label={editingId ? 'New Password (optional)' : 'Password'}
              type="password"
              fullWidth
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <TextField
              select
              margin="dense"
              label="Role"
              fullWidth
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Employee">Employee</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
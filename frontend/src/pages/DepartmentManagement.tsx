// src/pages/DepartmentManagement.tsx
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
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  pageContainer,
  headerSection,
  dialogOuterPadding,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';
import { useNotification } from '../context/NotificationContext.tsx';

interface Department {
  id: number;
  department_id: number;
  department_name: string;
  description: string;
}

interface FormData {
  department_name: string;
  description: string;
}

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [form, setForm] = useState<FormData>({ department_name: '', description: '' });
  const [nameError, setNameError] = useState<string>('');

  const optionalColumns = ['description'] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    department_name: true,
    actions: true,
    description: true, 
  });

  const { showNotification } = useNotification();

  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(
        res.data.map((d: any) => ({
          id: d.department_id,
          department_id: d.department_id,
          department_name: d.department_name,
          description: d.description || '',
        }))
      );
    } catch (err: any) {
      console.error('Fetch departments error:', err);
      showNotification('Failed to load departments', 'error');
    }
  };

  const validateDepartmentName = (name: string, currentEditingId: number | null): string => {
    const trimmed = name.trim();

    // Check for duplicate 
    const isDuplicate = departments.some(
      (dept) => 
        dept.id !== currentEditingId && 
        dept.department_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      return 'Department Name already exists';
    }

    return '';
  };

  const handleOpen = (dept: Department | null = null) => {
    if (dept) {
      setEditingId(dept.id);
      setForm({
        department_name: dept.department_name || '',
        description: dept.description || '',
      });
    } else {
      setEditingId(null);
      setForm({ department_name: '', description: '' });
    }
    // Update error message after form is set
    setNameError(validateDepartmentName(dept?.department_name || '', dept?.id || null));
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ department_name: '', description: '' });
    setNameError('');
  };

  const handleSave = async () => {
    const error = validateDepartmentName(form.department_name, editingId);
    setNameError(error);

    if (error) {
      showNotification(error, 'error');
      return;
    }

    const trimmedName = form.department_name.trim();

    try {
      const payload = {
        department_name: trimmedName,
        description: form.description.trim() || null,
      };

      if (editingId) {
        await api.put(`/departments/${editingId}`, payload);
        showNotification('Department updated successfully', 'success');
      } else {
        await api.post('/departments', payload);
        showNotification('Department added successfully', 'success');
      }

      handleClose();
      fetchDepartments();
    } catch (err: any) {
      console.error('Save department error:', err);
      showNotification(
        err.response?.data?.message || 'Failed to save department',
        'error'
      );
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/departments/${selectedId}`);
      fetchDepartments();
      showNotification('Department deleted successfully', 'success');
    } catch (err: any) {
      console.error('Delete department error:', err);
      showNotification(
        err.response?.data?.message || 'Failed to delete department',
        'error'
      );
    } finally {
      setDeleteOpen(false);
    }
  };

  const columns = [
    {
      field: 'department_name',
      headerName: 'Department Name',
      flex: 1,
      minWidth: 50,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 100,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleOpen(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDeleteClick(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  // Save button disabled if name is empty or duplicate
  const isSaveDisabled = form.department_name.trim() === '' || !!nameError;

  return (
    <Box sx={pageContainer}>
      <Box sx={headerSection}>
        <Typography variant="h4">Department Management</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>
          Add Department
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={departments}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25, 50, 100]}
          pagination
          disableColumnMenu                
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
          sx={dataGridHeader}
        />
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>{editingId ? 'Edit Department' : 'Add New Department'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Department Name"
            fullWidth
            required
            value={form.department_name}
            onChange={(e) => {
              const value = e.target.value;
              setForm({ ...form, department_name: value });
              setNameError(validateDepartmentName(value, editingId));
            }}
            helperText={nameError || ' '}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this department? This action cannot be undone.
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

export default DepartmentManagement;
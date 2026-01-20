// src/pages/EmployeeManagement.tsx
import React, { useEffect, useState, useMemo } from 'react';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { DataGrid, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext.tsx';
import {
  pageContainer,
  headerSection,
  dialogGrid,
  dialogOuterPadding,
  dataGridHeader,
  CustomToolbar,
} from '../common/mui_components.tsx';
import dayjs from 'dayjs'; 

interface Department {
  department_id: number;
  department_name: string;
}

interface UserOption {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface EmployeeRow {
  id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
  salary: number;
  status: string;
  joining_date: string;
  next_increment: string;
  first_name: string;
  last_name: string;
  is_experienced: boolean;
  previous_company: string | null;
  previous_salary: number | null;
  raw: any;
}

interface FormData {
  user_id: string;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  joining_date: string;
  department_id: string;
  designation: string;
  salary: string;
  status: string;
  is_experienced: boolean;
  previous_company: string;
  previous_salary: string;
  next_increment: string;
}

const EmployeeManagement: React.FC = () => {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const optionalColumns = [
    'salary',
    'joining_date',
    'next_increment',
    'status',
    'is_experienced',
    'previous_company',
    'previous_salary',
  ] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    name: true,
    email: true,
    department: true,
    designation: true,
    salary: true,
    joining_date: true,
    next_increment: true,
    status: true,
    is_experienced: true,
    previous_company: true,
    previous_salary: true,
    actions: true,
  });

  const { showNotification } = useNotification();

  const initialForm: FormData = {
    user_id: '',
    username: '',
    email: '',
    role: '',
    first_name: '',
    last_name: '',
    dob: '',
    gender: '',
    phone: '',
    address: '',
    joining_date: '',
    department_id: '',
    designation: '',
    salary: '',
    status: 'Active',
    is_experienced: false,
    previous_company: '',
    previous_salary: '',
    next_increment: '',
  };

  const [form, setForm] = useState<FormData>(initialForm);

  const roleToDesignation: Record<string, string> = {
    Admin: 'Administrator',
    HR: 'HR Manager',
    Manager: 'Team Manager',
    Employee: 'Employee',
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const MAX_AGE_ALLOWED = 65;
  const minDobYear = currentYear - MAX_AGE_ALLOWED;
  const minDate = useMemo(() => `${minDobYear}-01-01`, [minDobYear]);

  const MIN_AGE_REQUIRED = 18;
  const maxDobYear = currentYear - MIN_AGE_REQUIRED;
  const maxDob = useMemo(() => `${maxDobYear}-12-31`, [maxDobYear]);

  const maxJoining = useMemo(() => {
    const date = new Date();
    date.setMonth(currentMonth + 2);
    return date.toISOString().split('T')[0];
  }, []);

  // ← Validation for Next Increment Date
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const tomorrow = useMemo(() => dayjs().add(1, 'day').format('YYYY-MM-DD'), []);
  const [nextIncrementError, setNextIncrementError] = useState<string>('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchAvailableUsers();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setRows(
        res.data.map((e: any) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          department: e.department,
          designation: e.designation,
          salary: e.salary,
          status: e.status,
          joining_date: e.joining_date,
          next_increment: e.next_increment || 'N/A',
          first_name: e.first_name,
          last_name: e.last_name,
          is_experienced: e.is_experienced,
          previous_company: e.previous_company,
          previous_salary: e.previous_salary,
          raw: e.raw,
        }))
      );
    } catch (err: any) {
      showNotification('Failed to load employees', 'error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err: any) {
      showNotification('Failed to load departments', 'error');
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const usersRes = await api.get('/users');
      const employeesRes = await api.get('/employees');
      const employeeUserIds = new Set(employeesRes.data.map((e: any) => e.user_id));

      const available = usersRes.data
        .filter((u: any) => u.created_by === 1)
        .filter((u: any) => !employeeUserIds.has(u.id))
        .map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
        }));

      setAvailableUsers(available);
    } catch (err: any) {
      showNotification('Failed to load available users', 'error');
    }
  };

  const handleOpen = (employee: EmployeeRow | null = null) => {
    if (employee) {
      setEditingId(employee.id);
      setForm({
        user_id: employee.raw.user_id?.toString() || '',
        username: employee.raw.User?.username || '',
        email: employee.raw.User?.email || '',
        role: employee.raw.User?.role || 'Employee',
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        dob: employee.raw.dob || '',
        gender: employee.raw.gender || '',
        phone: employee.raw.phone || '',
        address: employee.raw.address || '',
        joining_date: employee.raw.joining_date || '',
        department_id: employee.raw.department_id?.toString() || '',
        designation: employee.designation || '',
        salary: employee.salary?.toString() || '',
        status: employee.status || 'Active',
        is_experienced: employee.is_experienced || false,
        previous_company: employee.previous_company || '',
        previous_salary: employee.previous_salary?.toString() || '',
        next_increment: employee.raw.next_increment || '',
      });
      // Validate next_increment on load (for edit)
      if (employee.raw.next_increment && employee.raw.next_increment <= today) {
        setNextIncrementError('Next Increment Date must be tomorrow or later');
      } else {
        setNextIncrementError('');
      }
    } else {
      setEditingId(null);
      setForm(initialForm);
      setNextIncrementError('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setNextIncrementError('');
  };

  const handleUserSelect = (userId: string) => {
    const selected = availableUsers.find((u) => u.id.toString() === userId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        user_id: userId,
        username: selected.username,
        email: selected.email,
        role: selected.role,
        designation: roleToDesignation[selected.role] || 'Employee',
      }));
    }
  };

  const validateForm = () => {
    if (!form.first_name || !form.last_name || !form.joining_date || !form.designation || !form.salary) {
      showNotification('Please fill all required fields', 'error');
      return false;
    }

    const nameRegex = /^[A-Za-z]+$/;
    if (!nameRegex.test(form.first_name)) {
      showNotification('First Name must contain only alphabets (no spaces)', 'error');
      return false;
    }
    if (!nameRegex.test(form.last_name)) {
      showNotification('Last Name must contain only alphabets (no spaces)', 'error');
      return false;
    }

    if (form.phone && (form.phone.length > 10 || !/^\d+$/.test(form.phone))) {
      showNotification('Phone number must be up to 10 digits', 'error');
      return false;
    }

    const salaryNum = Number(form.salary);
    if (!/^\d+$/.test(form.salary) || isNaN(salaryNum) || salaryNum <= 0) {
      showNotification('Salary must be a positive whole number', 'error');
      return false;
    }

    if (form.is_experienced) {
      const prevSalaryNum = Number(form.previous_salary);
      if (!form.previous_salary || !/^\d+$/.test(form.previous_salary) || isNaN(prevSalaryNum) || prevSalaryNum <= 0) {
        showNotification('Previous Salary must be a positive whole number', 'error');
        return false;
      }
    }

    if (form.dob) {
      const dobYear = Number(form.dob.split('-')[0]);
      if (dobYear < minDobYear || dobYear > maxDobYear) {
        showNotification(`Birth year must be between ${minDobYear} and ${maxDobYear} (age 18-65)`, 'error');
        return false;
      }
    }

    // Next Increment validation
    if (form.next_increment && form.next_increment <= today) {
      showNotification('Next Increment Date must be tomorrow or a future date', 'error');
      setNextIncrementError('Next Increment Date must be tomorrow or later');
      return false;
    }

    setNextIncrementError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let userId: number | null = editingId
        ? rows.find((r) => r.id === editingId)?.raw.user_id
        : Number(form.user_id);

      if (!editingId && !form.user_id) {
        showNotification('Please select a user', 'error');
        return;
      }

      const payload = {
        user_id: userId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dob: form.dob || null,
        gender: form.gender || null,
        phone: form.phone || null,
        address: form.address || null,
        joining_date: form.joining_date || null,
        department_id: form.department_id ? Number(form.department_id) : null,
        designation: form.designation.trim(),
        salary: Number(form.salary),
        status: form.status,
        is_experienced: form.is_experienced,
        previous_company: form.is_experienced ? form.previous_company.trim() : null,
        previous_salary:
          form.is_experienced && form.previous_salary ? Number(form.previous_salary) : null,
        next_increment: form.next_increment || null,
      };

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        showNotification('Employee updated successfully', 'success');
      } else {
        await api.post('/employees', payload);
        showNotification('Employee added successfully', 'success');
      }

      handleClose();
      fetchEmployees();
      fetchAvailableUsers();
    } catch (err: any) {
      console.error('Save error:', err);
      showNotification(err.response?.data?.message || 'Failed to save employee', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/employees/${selectedId}`);
      fetchEmployees();
      showNotification('Employee deleted successfully', 'success');
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to delete employee', 'error');
    } finally {
      setDeleteOpen(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 160 },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 160 },
    { field: 'salary', headerName: 'Salary (₹)', flex: 1, minWidth: 130 },
    { field: 'joining_date', headerName: 'Joining Date', flex: 1, minWidth: 140 },
    { field: 'next_increment', headerName: 'Next Increment', flex: 1, minWidth: 160 },
    { field: 'status', headerName: 'Status', flex: 1, minWidth: 100 },
    {
      field: 'is_experienced',
      headerName: 'Experience Status',
      flex: 1,
      minWidth: 160,
      valueGetter: (params: any) => (params.row.is_experienced ? 'Experienced' : 'Fresher'),
    },
    {
      field: 'previous_company',
      headerName: 'Previous Company',
      flex: 1,
      minWidth: 180,
      valueGetter: (params: any) =>
        params.row.is_experienced ? params.row.previous_company || 'N/A' : '—',
    },
    {
      field: 'previous_salary',
      headerName: 'Previous Salary (₹)',
      flex: 1,
      minWidth: 160,
      valueGetter: (params: any) =>
        params.row.is_experienced && params.row.previous_salary
          ? params.row.previous_salary
          : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
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

  return (
    <Box sx={pageContainer}>
      <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        mx: '0',                
      }}
      >
        <Box sx={headerSection}>
          <Typography variant="h4">Employee Management</Typography>
          <Button variant="contained" onClick={() => handleOpen()}>
           Add Employee
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%', maxWidth: '100%', mx:'0', }}>
        <Box sx={{ minWidth: 1200 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
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
      </Box>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        <DialogContent>
          <Box sx={dialogGrid}>
            {!editingId && (
              <TextField
                select
                label="Select User (Superuser-created)"
                fullWidth
                required
                value={form.user_id}
                onChange={(e) => handleUserSelect(e.target.value)}
                helperText="Users created by Superuser not yet assigned"
              >
                {availableUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.username} ({user.email}) - {user.role}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Username"
              fullWidth
              value={form.username}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Email"
              fullWidth
              value={form.email}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Role"
              fullWidth
              value={form.role}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Designation"
              fullWidth
              value={form.designation}
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="First Name"
              fullWidth
              required
              value={form.first_name}
              onChange={(e) => {
                const value = e.target.value.replace(/[^A-Za-z]/g, '');
                setForm({ ...form, first_name: value });
              }}
              inputProps={{ maxLength: 50 }}
            />
            <TextField
              label="Last Name"
              fullWidth
              required
              value={form.last_name}
              onChange={(e) => {
                const value = e.target.value.replace(/[^A-Za-z]/g, '');
                setForm({ ...form, last_name: value });
              }}
              inputProps={{ maxLength: 50 }}
            />
            <TextField
              label="Date of Birth"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.dob || ''}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              InputProps={{
                inputProps: { min: minDate, max: maxDob },
              }}
            />
            <TextField
              select
              label="Gender"
              fullWidth
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            <TextField
              label="Phone"
              fullWidth
              value={form.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm({ ...form, phone: value });
              }}
              inputProps={{ maxLength: 10 }}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={4}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <TextField
              label="Joining Date"
              type="date"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              value={form.joining_date || ''}
              onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              InputProps={{
                inputProps: { min: minDate, max: maxJoining },
              }}
            />
            <TextField
              select
              label="Department"
              fullWidth
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              {departments.map((d) => (
                <MenuItem key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Salary (₹)"
              fullWidth
              required
              value={form.salary}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setForm({ ...form, salary: value });
              }}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (!/^\d+$/.test(pasted)) {
                  e.preventDefault();
                }
              }}
              inputProps={{ maxLength: 12 }}
            />

            {/* Next Increment Date with validation */}
            <TextField
              label="Next Increment Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.next_increment || ''}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, next_increment: value });
                if (value && value <= today) {
                  setNextIncrementError('Next Increment Date must be tomorrow or later');
                } else {
                  setNextIncrementError('');
                }
              }}
              InputProps={{
                inputProps: { min: tomorrow }, 
              }}
              error={!!nextIncrementError}
              helperText={nextIncrementError || 'Must be tomorrow or future date'}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_experienced}
                  onChange={(e) => setForm({ ...form, is_experienced: e.target.checked })}
                />
              }
              label="Experienced (not Fresher)"
            />
            {form.is_experienced && (
              <>
                <TextField
                  label="Previous Company"
                  fullWidth
                  value={form.previous_company}
                  onChange={(e) => setForm({ ...form, previous_company: e.target.value })}
                />
                <TextField
                  label="Previous Salary (₹)"
                  fullWidth
                  required={form.is_experienced}
                  value={form.previous_salary}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setForm({ ...form, previous_salary: value });
                  }}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (!/^\d+$/.test(pasted)) {
                      e.preventDefault();
                    }
                  }}
                  inputProps={{ maxLength: 12 }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.user_id && !editingId}>
            {editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this employee? This action cannot be undone.
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

export default EmployeeManagement;
// src/pages/PayrollManagement.tsx
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
  InputAdornment,
} from '@mui/material';
import { DataGrid, GridColumnVisibilityModel, GridValueFormatterParams } from '@mui/x-data-grid';
import { Delete as DeleteIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
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
import dayjs from 'dayjs';

interface Employee {
  employee_id?: number;
  first_name: string;
  last_name: string;
  designation: string;
  salary: number | string;
}

interface PayrollRow {
  id: number;
  employee_name: string;
  month: string;
  basic_salary: number;
  monthly_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  payment_date: string;
}

interface FormData {
  employee_id: string;
  month: string;
  basic_salary: string;
  monthly_salary: string;
  bonus: string;
  deductions: string;
}

const PayrollManagement: React.FC = () => {
  const [payrolls, setPayrolls] = useState<PayrollRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [form, setForm] = useState<FormData>({
    employee_id: '',
    month: '',
    basic_salary: '',
    monthly_salary: '',
    bonus: '0',
    deductions: '0',
  });

  const optionalColumns = ['basic_salary', 'monthly_salary', 'bonus', 'deductions', 'payment_date'] as const;

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    employee_name: true,
    month: true,
    net_salary: true,
    actions: true,
    basic_salary: true,
    monthly_salary: true,
    bonus: true,
    deductions: true,
    payment_date: true,
  });

  const { showNotification } = useNotification();

  const navigate = useNavigate();

  const setDefaultMonth = () => {
    const previousMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
    setForm((prev) => ({
      ...prev,
      month: previousMonth,
    }));
  };

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const res = await api.get('/payroll');
      setPayrolls(
        res.data.map((p: any) => ({
          id: p.payroll_id,
          employee_name: p.Employee
            ? `${p.Employee.first_name || ''} ${p.Employee.last_name || ''}`.trim() || 'N/A'
            : 'N/A',
          month: p.month,
          basic_salary: Number(p.basic_salary),
          monthly_salary: Number(p.monthly_salary || (p.basic_salary / 12).toFixed(2)),
          bonus: Number(p.bonus),
          deductions: Number(p.deductions),
          net_salary: Number(p.net_salary),
          payment_date: p.payment_date || 'N/A',
        }))
      );
    } catch (err: any) {
      console.error('Fetch payrolls error:', err);
      showNotification('Failed to load payroll records', 'error');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      const validEmployees = res.data
        .map((emp: any) => ({
          employee_id: emp.employee_id || emp.id || null,
          first_name: emp.first_name || 'Unknown',
          last_name: emp.last_name || '',
          designation: emp.designation || 'N/A',
          salary: emp.salary || 0,
        }))
        .filter((emp: Employee) => emp.employee_id !== null)
        // Exclude Admin users from the dropdown
        .filter((emp: Employee) => 
          emp.designation.toLowerCase() !== 'admin'
        );

      setEmployees(validEmployees);
    } catch (err: any) {
      console.error('Fetch employees error:', err);
      showNotification('Failed to load employees', 'error');
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const selectedEmp = employees.find((emp) => emp.employee_id === Number(employeeId));

    if (selectedEmp) {
      const basic = Number(selectedEmp.salary || 0);
      const monthly = Number((basic / 12).toFixed(2));

      setForm((prev) => ({
        ...prev,
        employee_id: employeeId,
        basic_salary: String(basic),
        monthly_salary: String(monthly),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        employee_id: employeeId,
        basic_salary: '',
        monthly_salary: '',
      }));
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let mm = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);

    if (mm && Number(mm) > 12) {
      mm = mm.slice(0, 1);
    }

    const currentYear = dayjs().format('YYYY');
    const newMonth = mm ? `${currentYear}-${mm.padStart(2, '0')}` : `${currentYear}-`;

    setForm((prev) => ({
      ...prev,
      month: newMonth,
    }));
  };

  const handleOpen = () => {
    setDefaultMonth();
    setForm((prev) => ({
      ...prev,
      employee_id: '',
      basic_salary: '',
      monthly_salary: '',
      bonus: '0',
      deductions: '0',
    }));
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    const bonusNum = Number(form.bonus);
    const deductionsNum = Number(form.deductions);
    const monthlyNum = Number(form.monthly_salary);

    if (form.bonus === '' || isNaN(bonusNum) || !Number.isInteger(bonusNum) || bonusNum < 0) {
      showNotification('Bonus must be a positive whole number (0 or more)', 'error');
      return;
    }

    if (form.deductions === '' || isNaN(deductionsNum) || !Number.isInteger(deductionsNum) || deductionsNum < 0) {
      showNotification('Deductions must be a positive whole number (0 or more)', 'error');
      return;
    }

    if (!form.employee_id) {
      showNotification('Please select an employee', 'error');
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(form.month)) {
      showNotification('Month must be in YYYY-MM format', 'error');
      return;
    }

    const [year, month] = form.month.split('-').map(Number);
    const currentYear = dayjs().year();

    if (year !== currentYear) {
      showNotification('Year must be the current year', 'error');
      return;
    }

    if (month < 1 || month > 12) {
      showNotification('Month must be between 01 and 12', 'error');
      return;
    }

    try {
      const payload = {
        employee_id: Number(form.employee_id),
        month: form.month,
        basic_salary: Number(form.basic_salary),
        monthly_salary: monthlyNum,
        bonus: bonusNum,
        deductions: deductionsNum,
        net_salary: monthlyNum + bonusNum - deductionsNum,
      };

      await api.post('/payroll/generate', payload);

      handleClose();
      fetchPayrolls();
      showNotification('Payroll generated successfully', 'success');
    } catch (err: any) {
      console.error('Generate payroll error:', err);
      showNotification(
        err.response?.data?.message || 'Failed to generate payroll',
        'error'
      );
    }
  };

  const handleViewPayslip = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please login to view payslip', 'error');
        return;
      }

      const url = `/payroll/${id}/payslip`;

      const response = await fetch(api.defaults.baseURL + url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payslip');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      console.error('View payslip error:', err);
      showNotification(err.message || 'Failed to load payslip', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    try {
      await api.delete(`/payroll/${selectedId}`);
      fetchPayrolls();
      showNotification('Payroll record deleted successfully', 'success');
    } catch (err: any) {
      console.error('Delete payroll error:', err);
      showNotification(
        err.response?.data?.message || 'Failed to delete payroll record',
        'error'
      );
    } finally {
      setDeleteOpen(false);
    }
  };

  const formatCurrency = (params: GridValueFormatterParams<number>) =>
    `₹${params.value.toLocaleString('en-IN')}`;

  const columns = [
    { field: 'employee_name', headerName: 'Employee', flex: 1, minWidth: 200 },
    { field: 'month', headerName: 'Month', flex: 1, minWidth: 120 },
    {
      field: 'basic_salary',
      headerName: 'Basic (₹)',
      flex: 1,
      minWidth: 140,
      valueFormatter: formatCurrency,
    },
    {
      field: 'monthly_salary',
      headerName: 'Monthly Salary (₹)',
      flex: 1,
      minWidth: 140,
      valueFormatter: formatCurrency,
    },
    {
      field: 'bonus',
      headerName: 'Bonus (₹)',
      flex: 1,
      minWidth: 120,
      valueFormatter: formatCurrency,
    },
    {
      field: 'deductions',
      headerName: 'Deductions (₹)',
      flex: 1,
      minWidth: 140,
      valueFormatter: formatCurrency,
    },
    {
      field: 'net_salary',
      headerName: 'Net Salary (₹)',
      flex: 1,
      minWidth: 140,
      valueFormatter: formatCurrency,
    },
    { field: 'payment_date', headerName: 'Date', flex: 1, minWidth: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <>
          <Tooltip title="View Payslip (PDF)">
            <IconButton onClick={() => handleViewPayslip(params.row.id)}>
              <PdfIcon color="primary" />
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
      <Box sx={headerSection}>
        <Typography variant="h4">Payroll Management</Typography>
        <Button variant="contained" onClick={handleOpen}>
          Generate Payroll
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={payrolls}
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

      {/* Generate Payroll Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth sx={dialogOuterPadding}>
        <DialogTitle>Generate Payroll</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Employee"
            margin="dense"
            value={form.employee_id}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            required
          >
            {employees.length === 0 ? (
              <MenuItem disabled>No employees available</MenuItem>
            ) : (
              employees.map((emp, index) => (
                <MenuItem
                  key={emp.employee_id ?? `emp-${index}`}
                  value={emp.employee_id?.toString() ?? ''}
                  disabled={!emp.employee_id}
                >
                  {emp.first_name} {emp.last_name} - {emp.designation} (₹{emp.salary ?? 'N/A'})
                </MenuItem>
              ))
            )}
          </TextField>

          {/* Month with fixed year */}
          <TextField
            fullWidth
            label="Month"
            margin="dense"
            value={form.month ? form.month.split('-')[1] || '' : ''}
            onChange={(e) => {
              let mm = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);

              if (mm && Number(mm) > 12) {
                mm = mm.slice(0, 1);
              }

              const currentYear = dayjs().format('YYYY');
              const newMonth = mm ? `${currentYear}-${mm.padStart(2, '0')}` : `${currentYear}-`;

              setForm((prev) => ({
                ...prev,
                month: newMonth,
              }));
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {dayjs().format('YYYY')}-
                </InputAdornment>
              ),
            }}
            inputProps={{
              maxLength: 2,
              placeholder: 'MM',
              pattern: '\\d{2}',
            }}
            required
          />

          <TextField
            fullWidth
            label="Basic Salary (₹)"
            type="number"
            margin="dense"
            value={form.basic_salary}
            InputProps={{ readOnly: true }}
            required
          />

          <TextField
            fullWidth
            label="Monthly Salary (₹)"
            type="number"
            margin="dense"
            value={form.monthly_salary}
            InputProps={{ readOnly: true }}
          />

          <TextField
            fullWidth
            label="Bonus (₹)"
            type="text"
            margin="dense"
            value={form.bonus}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
              setForm({ ...form, bonus: value });
            }}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
            error={
              form.bonus !== '' &&
              (isNaN(Number(form.bonus)) ||
                !Number.isInteger(Number(form.bonus)) ||
                Number(form.bonus) < 0)
            }
            helperText={
              form.bonus !== '' &&
              (isNaN(Number(form.bonus)) ||
                !Number.isInteger(Number(form.bonus)) ||
                Number(form.bonus) < 0)
                ? 'Must be a positive whole number (0 or more, max 10 digits)'
                : 'Positive whole number only (max 10 digits)'
            }
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 10,
            }}
            required
          />

          <TextField
            fullWidth
            label="Deductions (₹)"
            type="text"
            margin="dense"
            value={form.deductions}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
              setForm({ ...form, deductions: value });
            }}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
            error={
              form.deductions !== '' &&
              (isNaN(Number(form.deductions)) ||
                !Number.isInteger(Number(form.deductions)) ||
                Number(form.deductions) < 0)
            }
            helperText={
              form.deductions !== '' &&
              (isNaN(Number(form.deductions)) ||
                !Number.isInteger(Number(form.deductions)) ||
                Number(form.deductions) < 0)
                ? 'Must be a positive whole number (0 or more, max 10 digits)'
                : 'Positive whole number only (max 10 digits)'
            }
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 10,
            }}
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} sx={dialogOuterPadding}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this payroll record? This action cannot be undone.
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

export default PayrollManagement;
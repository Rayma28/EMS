const ExcelJS = require('exceljs');
const dayjs = require('dayjs');

const generateExcel = async (data, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Default header style
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  /*=== EMPLOYEE REPORT ===*/
  if (sheetName === 'employees') {
    const rows = data.map((emp, index) => {
      const e = emp.dataValues || emp; 
      return {
        sr_no: index + 1,
        name: `${e.first_name} ${e.last_name}`,
        username: e.User?.username || '',
        email: e.User?.email || '',
        dob: e.dob,
        gender: e.gender,
        phone: e.phone,
        address: e.address,
        joining_date: e.joining_date,
        department: e.Department?.department_name || '',
        designation: e.designation,
        salary: e.salary,
        status: e.status,
        documents: e.documents,
        is_experienced: e.is_experienced ? 'Yes' : 'No',
        previous_company: e.previous_company,
        previous_salary: e.previous_salary,
        next_increment: e.next_increment,
      };
    });

    sheet.columns = [
      { header: 'Sr No.', key: 'sr_no', width: 8 },
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'DOB', key: 'dob', width: 14 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Address', key: 'address', width: 25 },
      { header: 'Joining Date', key: 'joining_date', width: 15 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Designation', key: 'designation', width: 18 },
      { header: 'Salary', key: 'salary', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Documents', key: 'documents', width: 18 },
      { header: 'Experienced', key: 'is_experienced', width: 14 },
      { header: 'Previous Company', key: 'previous_company', width: 22 },
      { header: 'Previous Salary', key: 'previous_salary', width: 16 },
      { header: 'Next Increment', key: 'next_increment', width: 16 },
    ];

    sheet.getRow(1).eachCell((cell) => (cell.style = headerStyle));
    rows.forEach(row => sheet.addRow(row));
  }

  /*=== ATTENDANCE REPORT ===*/
  else if (sheetName === 'attendance') {
    const { attendances = [], leaves = [] } = data; 

    // Build attendance map (present days per employee)
    const attendanceMap = {};

    attendances.forEach(att => {
      const emp = att.Employee;
      if (!emp) return;
      const empId = emp.employee_id;
      if (!attendanceMap[empId]) {
        attendanceMap[empId] = {
          name: `${emp.first_name} ${emp.last_name}`,
          present: 0,
          leave: 0,
        };
      }
      attendanceMap[empId].present += 1;
    });

    // Add leave days (calculate overlapping days in the period)
    leaves.forEach(leave => {
      const empId = leave.employee_id;
      if (!attendanceMap[empId]) return;

      const from = dayjs(leave.start_date);
      const to = dayjs(leave.end_date);
      const leaveDays = to.diff(from, 'day') + 1; 
      attendanceMap[empId].leave += leaveDays;
    });

    sheet.columns = [
      { header: 'Sr No.', key: 'sr_no', width: 8 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Present Days', key: 'present', width: 16 },
      { header: 'Leave Days', key: 'leave', width: 14 },
      { header: 'Attendance %', key: 'percentage', width: 18 },
    ];

    sheet.getRow(1).eachCell((cell) => (cell.style = headerStyle));

    const rows = Object.values(attendanceMap).map((emp, index) => {
      const totalDays = emp.present + emp.leave;
      const percentage = totalDays > 0 ? ((emp.present / totalDays) * 100).toFixed(2) : '0.00';
      return {
        sr_no: index + 1,
        name: emp.name,
        present: emp.present,
        leave: emp.leave,
        percentage: `${percentage}%`,
      };
    });

    if (rows.length === 0) {
      sheet.addRow(['No attendance or leave records found for the selected period.']);
      sheet.getRow(2).font = { italic: true };
      sheet.getRow(2).alignment = { horizontal: 'center' };
    } else {
      rows.forEach(row => sheet.addRow(row));
    }
  }

  /*=== PAYROLL REPORT ===*/
  else if (sheetName === 'payroll') {
    sheet.columns = [
      { header: 'Sr No.', key: 'sr_no', width: 8 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Salary', key: 'salary', width: 15 },
      { header: 'Payment Date', key: 'date', width: 15 },
    ];

    sheet.getRow(1).eachCell((cell) => (cell.style = headerStyle));

    data.forEach((pay, index) => {
      sheet.addRow({
        sr_no: index + 1,
        name: `${pay.Employee?.first_name || ''} ${pay.Employee?.last_name || ''}`,
        month: pay.month,
        salary: pay.net_salary,
        date: pay.payment_date,
      });
    });
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getColumn('sr_no').alignment = { horizontal: 'left' };

  return workbook.xlsx.writeBuffer();
}

module.exports = { generateExcel };
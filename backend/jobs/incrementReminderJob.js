const cron = require('node-cron');
const Sequelize = require('sequelize');
const { Employee, User, Department } = require('../models');   
const { sendEmail } = require('../utils/email');

const CRON_SCHEDULE = '15 12 24 4 *';     // Change to '0 9 1 4 *' min-hour-day-month-weekday
const TIMEZONE = 'Asia/Kolkata';


async function sendIncrementReminder() {
  console.log('[Increment Job] Running annual increment reminder...');

  try {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    const employeesDue = await Employee.findAll({
      where: {
        joining_date: { [Sequelize.Op.lte]: oneYearAgo },
      },
      attributes: [
        'employee_id',
        'first_name',
        'last_name',
        'username',
        'designation',
        'joining_date',
        'salary'
      ],
      include: [
        {
          model: Department,
          attributes: ['department_name'],
          required: false
        }
      ],
      raw: false,                    
      order: [['joining_date', 'ASC']],
    });

    if (employeesDue.length === 0) {
      console.log('No employees due for increment this year.');
      return;
    }

    const employeeRows = employeesDue
      .map(emp => {
        const e = emp.dataValues || emp;
        const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.username || 'N/A';
        const deptName = e.Department?.department_name || 'N/A';

        return `
          <tr>
            <td>${e.employee_id || 'N/A'}</td>
            <td>${fullName}</td>
            <td>${deptName}</td>
            <td>${e.designation || 'N/A'}</td>
            <td>${e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN') : 'N/A'}</td>
            <td>₹${Number(e.salary || 0).toLocaleString('en-IN')}</td>
          </tr>`;
      })
      .join('');

    const emailHtml = `
      <h2>Annual Salary Increment Reminder - ${today.getFullYear()}</h2>
      <p>Dear HR Team,</p>
      <p>The following employees are due for their annual increment:</p>
      
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead style="background-color: #f4f4f4;">
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Joining Date</th>
            <th>Current Salary</th>
          </tr>
        </thead>
        <tbody>${employeeRows}</tbody>
      </table>

      <p><strong>Total Employees Due:</strong> ${employeesDue.length}</p>
      <p>Please review and process the increments at the earliest.</p>
      <br>
      <p>Regards,<br><strong>Employee Management System</strong></p>
    `;

    // HR Emails
    const hrUsers = await User.findAll({
      where: { role: 'HR' },
      attributes: ['email'],
      raw: true,
    });

    let hrEmails = hrUsers.map(u => u.email).filter(Boolean);

    if (hrEmails.length === 0) {
      console.log('No HR users found. Using fallback email.');
      hrEmails = [process.env.EMAIL_USER];
    }

    const success = await sendEmail(
      hrEmails.join(','), 
      `Annual Increment Reminder - ${today.getFullYear()}`, 
      emailHtml, 
      true
    );

    if (success) {
      console.log(`[Increment Job] Reminder sent successfully to ${hrEmails.length} HR email(s)`);
    } else {
      console.error('[Increment Job] Failed to send email');
    }

  } catch (error) {
    console.error('[Increment Job] Error occurred:', error.message);
  }
}

// Start Scheduler
function startIncrementScheduler() {
  cron.schedule(CRON_SCHEDULE, sendIncrementReminder, {
    timezone: TIMEZONE,
  });
  console.log(`Increment reminder scheduler started (runs on ${CRON_SCHEDULE})`);
}

module.exports = { startIncrementScheduler };
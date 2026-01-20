# Employment Management System (EMS) - Kit Solutions

A full-stack **Employee Management System** built for managing employee records, attendance, leaves, payroll, performance reviews, and role-based access control.

## Features

- **Employee Records Management** — Add, update, view, delete employees; upload documents
- **Recruitment & Onboarding** — Basic employee onboarding workflow
- **Attendance & Leave Tracking** — Daily check-in/check-out, monthly summaries, leave requests & approvals
- **Payroll Processing** — Salary structure, bonus/deductions, monthly payslip generation (PDF)
- **Performance Evaluation** — Reviews, ratings, feedback, manager comments
- **Role-Based Access Control (RBAC)** — Admin, HR, Manager, Employee roles with restricted access
- **Reports & Exports** — Employee, attendance, payroll reports (PDF/Excel)
- **Audit Logs** — Track who created/updated employee records and when
- **API Documentation & Testing** — Swagger (OpenAPI) for REST API
- **Responsive Dashboard** — Overview with charts, quick links, notifications

## Technologies

- **Frontend**: React.js + Material-UI (MUI)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (with Sequelize ORM)
- **Authentication**: JWT-based + Role-based access
- **File Uploads**: Multer (documents/resumes/ID proofs)
- **API Documentation**: Swagger (OpenAPI)
- **State Management**: Redux (optional for auth)
- **Styling**: Material-UI + Custom components

## User Roles & Access

| Role       | Description                                   | Main Pages & Features                        |
|------------|-----------------------------------------------|----------------------------------------------|
| **Admin**  | Manages system, roles, configurations         | All pages + settings + role management       |
| **HR**     | Manages employees, recruitment, payroll       | Employees, Attendance, Leaves, Payroll, Reports |
| **Manager**| Reviews performance, approves requests        | Attendance, Leaves, Performance, Approvals   |
| **Employee**| Self-service portal                           | Dashboard, Attendance, Leaves, Profile       |

## Functional Requirements

1. **Employee Management**
   - Add/Update/View/Delete employees
   - Upload documents (resume, ID proofs)
   - Assign departments & roles
   - View full profile (linked to user account)

2. **Authentication & Authorization**
   - Login/Logout with JWT
   - Role-based access control (RBAC)

3. **Attendance Management**
   - Daily check-in/check-out
   - Monthly attendance reports

4. **Leave Management**
   - Apply for leave
   - Approve/Reject leaves
   - Leave balance tracking

5. **Payroll Management**
   - Salary structure
   - Bonus/Deductions
   - Monthly payslip generation (PDF)

6. **Performance Management**
   - Performance reviews (rating 1–5)
   - Feedback & manager comments

7. **Reports**
   - Employee reports
   - Attendance reports
   - Payroll reports
   - PDF/Excel export

## Pages & Navigation

1. **Login Page** — Authentication & role redirection
2. **Dashboard** — Overview (role-based)
3. **Employee Management** — Employee CRUD + documents
4. **Department Management** — Departments CRUD
5. **Attendance Management** — Daily attendance
6. **Leave Management** — Leave requests & approvals
7. **Payroll Management** — Salary & payslips
8. **Performance Management** — Reviews & ratings
9. **Reports Page** — Generate & export reports
10. **Profile Page** — User profile
11. **Settings Page** — Admin-only system settings
12. **Error / Unauthorized Page** — Security handling

## Setup Instructions

### Backend

```bash
cd backend
npm install
# Edit .env (DB credentials, JWT_SECRET, etc.)
npx sequelize-cli db:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```


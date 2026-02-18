// backend/controllers/profileController.js
const { Employee, User, Department } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let uploadPath;
    if (file.fieldname === 'profile_picture') {
      uploadPath = path.join(__dirname, '../uploads/profile_pictures');
    } else {
      uploadPath = path.join(__dirname, '../uploads/documents');
    }
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
}).fields([
  { name: 'documents', maxCount: 10 },
  { name: 'profile_picture', maxCount: 1 },
]);

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const employee = await Employee.findOne({
      where: { user_id: userId },
      include: [
        { model: User, attributes: ['id', 'username', 'email', 'role'] },
        { model: Department, attributes: ['department_id', 'department_name'] },
      ],
    });

    if (!employee) {
      return res.status(404).json({
        message: 'No employee profile found for this user. Contact HR/admin.',
      });
    }

    const profile = {
      employee_id: employee.employee_id,
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.User?.email || '',
      phone: employee.phone || null,
      address: employee.address || null,
      dob: employee.dob || null,
      gender: employee.gender || null,
      pan_number: employee.pan_number || null,
      aadhaar_number: employee.aadhaar_number || null,
      joining_date: employee.joining_date || null,
      designation: employee.designation || '',
      department: employee.Department?.department_name || 'Not assigned',
      department_id: employee.Department?.department_id || null,
      status: employee.status || 'Active',
      is_experienced: !!employee.is_experienced,
      previous_company: employee.previous_company || null,
      previous_salary: employee.previous_salary || null,
      next_increment: employee.next_increment || null,
      documents: employee.documents ? JSON.parse(employee.documents) : [],
      profile_picture: employee.profile_picture || null,
    };

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    return res.status(200).json(profile);
  } catch (error) {
    console.error('[getMyProfile] Error:', error);
    return res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

const updateMyProfile = async (req, res) => {
  upload(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('[Multer] Error:', multerErr);
      return res.status(400).json({ message: multerErr.message || 'File upload error' });
    }

    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const employee = await Employee.findOne({ where: { user_id: userId } });

      if (!employee) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      let documents = employee.documents ? JSON.parse(employee.documents) : [];

      if (req.body.remove_document) {
        let toRemove = req.body.remove_document;
        if (typeof toRemove === 'string') toRemove = [toRemove];

        for (const relPath of toRemove) {
          const fullPath = path.join(__dirname, '..', relPath);
          try {
            await fs.unlink(fullPath);
            console.log(`[DELETE] Removed: ${relPath}`);
          } catch (fsErr) {
            console.warn(`[DELETE] Could not delete ${relPath}:`, fsErr.message);
          }
        }

        documents = documents.filter((p) => !toRemove.includes(p));
      }

      if (req.files?.documents?.length > 0) {
        const newPaths = req.files.documents.map((file) =>
          // Store RELATIVE path
          path.join('uploads', 'documents', path.basename(file.path))
        );
        documents = [...documents, ...newPaths];
      }

      let profile_picture = employee.profile_picture;
      if (req.files?.profile_picture?.[0]) {
        const newPic = req.files.profile_picture[0];

        // Store RELATIVE path (this is the key fix)
        profile_picture = path.join('uploads', 'profile_pictures', path.basename(newPic.path));

        // Delete old picture (if exists)
        if (employee.profile_picture) {
          const oldFullPath = path.join(__dirname, '..', employee.profile_picture);
          try {
            await fs.unlink(oldFullPath);
            console.log(`[DELETE] Removed old profile picture: ${employee.profile_picture}`);
          } catch (e) {
            console.warn('Could not delete old profile picture:', e.message);
          }
        }
      }

      // Prepare update payload
      const updateData = {
        first_name: req.body.first_name?.trim() || employee.first_name,
        last_name: req.body.last_name?.trim() || employee.last_name,
        phone: req.body.phone !== undefined ? (req.body.phone?.trim() || null) : employee.phone,
        address: req.body.address !== undefined ? (req.body.address?.trim() || null) : employee.address,
        dob: req.body.dob !== undefined ? (req.body.dob || null) : employee.dob,
        gender: req.body.gender !== undefined ? (req.body.gender || null) : employee.gender,
        pan_number: req.body.pan_number !== undefined ? (req.body.pan_number?.trim() || null) : employee.pan_number,
        aadhaar_number: req.body.aadhaar_number !== undefined ? (req.body.aadhaar_number?.trim() || null) : employee.aadhaar_number,
        documents: documents.length > 0 ? JSON.stringify(documents) : null,
        profile_picture: profile_picture || null,
      };

      await employee.update(updateData);

      // Return refreshed profile
      const refreshed = await Employee.findOne({
        where: { user_id: userId },
        include: [User, Department],
      });

      const updatedProfile = {
        employee_id: refreshed.employee_id,
        first_name: refreshed.first_name || '',
        last_name: refreshed.last_name || '',
        email: refreshed.User?.email || '',
        phone: refreshed.phone || null,
        address: refreshed.address || null,
        dob: refreshed.dob || null,
        gender: refreshed.gender || null,
        pan_number: refreshed.pan_number || null,
        aadhaar_number: refreshed.aadhaar_number || null,
        joining_date: refreshed.joining_date || null,
        designation: refreshed.designation || '',
        department: refreshed.Department?.department_name || 'Not assigned',
        department_id: refreshed.Department?.department_id || null,
        status: refreshed.status || 'Active',
        is_experienced: !!refreshed.is_experienced,
        previous_company: refreshed.previous_company || null,
        previous_salary: refreshed.previous_salary || null,
        next_increment: refreshed.next_increment || null,
        documents: refreshed.documents ? JSON.parse(refreshed.documents) : [],
        profile_picture: refreshed.profile_picture || null,
      };

      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } catch (error) {
      console.error('[updateMyProfile] Error:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  });
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};
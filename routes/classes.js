const express = require('express');
const router = express.Router();
const multer = require('multer');
const { assignmentStorage } = require('../config/cloudinary');
const Class = require('../models/classModel');
const Assignment = require('../models/assignmentModel');

const upload = multer({ storage: assignmentStorage });

// Helper to generate dynamic slugs
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

// GET /classes - Show all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find().sort({ name: 1 });

    // For each class, calculate the count of active assignments
    const classesWithCounts = await Promise.all(classes.map(async (cls) => {
      const count = await Assignment.countDocuments({ classId: cls._id });
      return {
        _id: cls._id,
        name: cls.name,
        code: cls.code,
        assignmentCount: count
      };
    }));

    res.render('classes', { classes: classesWithCounts, error: null });
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).send("Internal Server Error");
  }
});

// POST /classes - Create a new class dynamically
router.post('/', async (req, res) => {
  try {
    const { className } = req.body;
    if (!className || className.trim() === "") {
      const classes = await Class.find().sort({ name: 1 });
      const classesWithCounts = await Promise.all(classes.map(async (cls) => {
        const count = await Assignment.countDocuments({ classId: cls._id });
        return { _id: cls._id, name: cls.name, code: cls.code, assignmentCount: count };
      }));
      return res.render('classes', { classes: classesWithCounts, error: "Class name is required" });
    }

    const code = slugify(className);

    // Check if class with same code/name already exists
    const existing = await Class.findOne({ $or: [{ code }, { name: className.trim() }] });
    if (existing) {
      const classes = await Class.find().sort({ name: 1 });
      const classesWithCounts = await Promise.all(classes.map(async (cls) => {
        const count = await Assignment.countDocuments({ classId: cls._id });
        return { _id: cls._id, name: cls.name, code: cls.code, assignmentCount: count };
      }));
      return res.render('classes', { classes: classesWithCounts, error: "Class already exists" });
    }

    const newClass = new Class({
      name: className.trim(),
      code: code
    });

    await newClass.save();
    res.redirect('/classes');
  } catch (err) {
    console.error("Error creating class:", err);
    res.status(500).send("Internal Server Error");
  }
});

// GET /classes/:code - Class Details (list assignments)
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const cls = await Class.findOne({ code });
    if (!cls) {
      return res.status(404).send("Class not found");
    }

    // Fetch assignments and sort by newest first
    const assignments = await Assignment.find({ classId: cls._id }).sort({ createdAt: -1 });

    res.render('class_detail', { cls, assignments, error: req.query.error || null });
  } catch (err) {
    console.error("Error fetching class details:", err);
    res.status(500).send("Internal Server Error");
  }
});

// POST /classes/:code/upload - Upload Assignment (PDF/Document) to Class
router.post('/:code/upload', upload.single('document'), async (req, res) => {
  try {
    const { code } = req.params;
    const { title, studentName } = req.body;
    const cls = await Class.findOne({ code });
    if (!cls) {
      return res.status(404).send("Class not found");
    }

    if (!req.file) {
      return res.redirect(`/classes/${code}?error=Please select a document to upload`);
    }

    if (!title || title.trim() === "") {
      return res.redirect(`/classes/${code}?error=Please enter an assignment title`);
    }

    // Expiry date set to 7 days from now (6-7 days automatically)
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const assignment = new Assignment({
      classId: cls._id,
      title: title.trim(),
      filename: req.file.originalname,
      url: req.file.path, // Cloudinary secure_url is stored here by multer-storage-cloudinary
      studentName: studentName && studentName.trim() !== "" ? studentName.trim() : undefined,
      expiryDate: expiryDate
    });

    await assignment.save();
    res.redirect(`/classes/${code}`);
  } catch (err) {
    console.error("Error uploading assignment:", err);
    res.redirect(`/classes/${req.params.code}?error=Upload failed`);
  }
});

// GET /classes/download/:id - Proxy download to preserve original filename and force download
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).send("Document not found");
    }

    const http = require('http');
    const https = require('https');

    const downloadStream = (url) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (fileRes) => {
        // Follow redirects (Cloudinary links often redirect to edge CDN servers)
        if ([301, 302, 307, 308].includes(fileRes.statusCode) && fileRes.headers.location) {
          return downloadStream(fileRes.headers.location);
        }

        if (fileRes.statusCode !== 200) {
          console.error(`Failed to fetch from storage, status code: ${fileRes.statusCode}`);
          return res.status(fileRes.statusCode).send("Failed to retrieve document from storage");
        }

        // Force attachment download with original filename
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(assignment.filename)}"`);
        if (fileRes.headers['content-type']) {
          res.setHeader('Content-Type', fileRes.headers['content-type']);
        }

        fileRes.pipe(res);
      }).on('error', (err) => {
        console.error("Cloudinary download stream error:", err);
        if (!res.headersSent) {
          res.status(500).send("Error streaming document");
        }
      });
    };

    downloadStream(assignment.url);
  } catch (err) {
    console.error("Download proxy route error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;

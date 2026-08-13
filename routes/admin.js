const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const File = require('../models/fileModel');
const Text = require('../models/textModel');
const { getIo } = require('../socket');
const { deleteFileById } = require('../components/file');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MailMyWorkAdminSecure2026!";

// Helper to timing-safely verify PBKDF2 hashed password
function verifyAdminPassword(inputPassword) {
  if (!inputPassword) return false;
  const salt = "mailmywork_salt_2026";
  const inputHash = crypto.pbkdf2Sync(inputPassword, salt, 100000, 64, 'sha512');
  const targetHash = crypto.pbkdf2Sync(ADMIN_PASSWORD, salt, 100000, 64, 'sha512');
  return crypto.timingSafeEqual(inputHash, targetHash);
}

// Authentication check middleware
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  res.redirect('/admin/login');
}

// Admin panel dashboard
router.get('/', isAdmin, async (req, res) => {
  try {
    const io = getIo();
    const liveVisitors = io ? io.engine.clientsCount : 0;

    const files = await File.find().sort({ createdAt: -1 });
    const texts = await Text.find().sort({ createdAt: -1 });

    res.render('admin_dashboard', {
      liveVisitors,
      files,
      texts,
      error: req.query.error || null
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Admin login form GET
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) {
    return res.redirect('/admin');
  }
  res.render('admin_login', { error: null });
});

// Admin login POST
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (verifyAdminPassword(password)) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.render('admin_login', { error: 'Invalid admin credentials' });
  }
});

// Admin logout GET
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Delete file endpoint
router.post('/delete-file/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFileById(id);
    res.redirect('/admin');
  } catch (err) {
    console.error("Error deleting file:", err);
    res.redirect('/admin?error=delete_file_failed');
  }
});

// Delete text endpoint
router.post('/delete-text/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Text.findByIdAndDelete(id);
    res.redirect('/admin');
  } catch (err) {
    console.error("Error deleting text:", err);
    res.redirect('/admin?error=delete_text_failed');
  }
});

module.exports = router;

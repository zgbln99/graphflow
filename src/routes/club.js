const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('../config/database');

const router = express.Router();
const db = Database.getInstance();

function requireAuth(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.redirect('/login');
}

router.get('/login', (req, res) => {
  if (req.session?.user?.id) return res.redirect('/');
  res.render('club/login', {
    title: 'Logowanie — ZASTAL MARKETING CENTER',
    error: null
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).render('club/login', {
        title: 'Logowanie — ZASTAL MARKETING CENTER',
        error: 'Podaj adres e-mail i hasło.'
      });
    }

    const user = await db.fetch(
      `SELECT id, email, password_hash, display_name, role, is_active
       FROM cg_users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).render('club/login', {
        title: 'Logowanie — ZASTAL MARKETING CENTER',
        error: 'Nieprawidłowy e-mail lub hasło.'
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      };
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect('/');
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('zmc_session');
    res.redirect('/login');
  });
});

router.get('/', requireAuth, (req, res) => {
  res.render('club/index', {
    title: 'ZASTAL MARKETING CENTER',
    user: req.session.user
  });
});

module.exports = router;

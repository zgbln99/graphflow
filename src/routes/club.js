const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('club/index', {
    title: 'Club Graphics',
    user: req.user || null
  });
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.user_name, u.email,
              r.role_name, u.unit_id
       FROM   App_User u
       JOIN   Role r ON u.role_id = r.role_id
       WHERE  u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
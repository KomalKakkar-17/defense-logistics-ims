const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/carbon → uses your vw_CarbonSummary view
// GET /api/carbon/audit → Carbon_Audit_Log
router.get('/audit', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cal.log_id, cal.request_id, cal.TotalCarbonEmitted, cal.DateCalculated
       FROM Carbon_Audit_Log cal
       ORDER BY cal.log_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM vw_CarbonSummary`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
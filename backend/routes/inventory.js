const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// GET /api/inventory           → all inventory
// GET /api/inventory?unit_id=2 → filtered by unit
router.get('/', async (req, res) => {
  try {
    const { unit_id } = req.query;

    let query = `
      SELECT inv.inv_id, inv.Quantity, inv.ExpiryDate, inv.BatchNumber,
             i.item_name, i.Weight, i.CarbonFootprintPerUnit,
             u.unit_name, c.category_name
      FROM   Inventory inv
      JOIN   Item i     ON inv.item_id = i.item_id
      JOIN   Unit u     ON inv.unit_id = u.unit_id
      JOIN   Category c ON i.category_id = c.category_id
    `;

    const params = [];
    if (unit_id) {
      query += ` WHERE inv.unit_id = ?`;
      params.push(unit_id);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/expiring → calls your cursor procedure
router.get('/expiring', async (req, res) => {
  try {
    const [rows] = await pool.query(`CALL ShowExpiringItems()`);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
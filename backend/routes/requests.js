const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ── GET /api/requests ─────────────────────────────────────
// Returns all pending requests using your view

// GET /api/requests/units — for dropdowns
router.get('/units', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT unit_id, unit_name FROM Unit ORDER BY unit_name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/requests/items — for item selector
router.get('/items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.item_id, i.item_name, c.category_name, i.Weight, i.CarbonFootprintPerUnit
       FROM Item i JOIN Category c ON i.category_id = c.category_id
       ORDER BY c.category_name, i.item_name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Add this new route ABOVE module.exports
router.get('/all', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT request_id, Status, Priority, TotalCarbonScore, RequestDate
       FROM Logistics_Request
       ORDER BY request_id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM vw_PendingRequests`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/requests ────────────────────────────────────
// Creates a new request
// Body: { requester_user_id, requester_unit_id, supplier_unit_id, items: [{item_id, quantity}] }
// NOTE: trg_check_sustainability fires on each Request_Item insert
router.post('/', async (req, res) => {
  const { requester_user_id, requester_unit_id, supplier_unit_id, items } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Step 1: Insert the main request
    const [result] = await conn.query(
      `INSERT INTO Logistics_Request 
         (requester_user_id, requester_unit_id, supplier_unit_id)
       VALUES (?, ?, ?)`,
      [requester_user_id, requester_unit_id, supplier_unit_id]
    );
    const request_id = result.insertId;

    // Step 2: Insert each item — trigger fires here!
    for (const item of items) {
      await conn.query(
        `INSERT INTO Request_Item (request_id, item_id, quantity_requested)
         VALUES (?, ?, ?)`,
        [request_id, item.item_id, item.quantity]
      );
    }

    await conn.commit();
    res.status(201).json({ request_id, message: 'Request created successfully' });

  } catch (err) {
    await conn.rollback();
    // Trigger error messages come through here as HTTP 400
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH /api/requests/:id/approve ──────────────────────
// Calls your ApproveRequest stored procedure
router.patch('/:id/approve', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `CALL ApproveRequest(?)`,
      [req.params.id]
    );
    // Procedure returns: "Request X approved. Carbon score: Y kg CO2"
    res.json(rows[0][0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── PATCH /api/requests/:id/reject ───────────────────────
router.patch('/:id/reject', async (req, res) => {
  try {
    await pool.query(
      `UPDATE Logistics_Request SET Status = 'REJECTED' WHERE request_id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
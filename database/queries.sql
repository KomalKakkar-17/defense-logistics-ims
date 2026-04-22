-- Shows all requests with full user and unit names
SELECT
  lr.request_id,
  au.user_name        AS requested_by,
  ru.unit_name        AS from_unit,
  su.unit_name        AS supplier_unit,
  lr.Status,
  lr.RequestDate
FROM Logistics_Request lr
  INNER JOIN App_User au ON lr.requester_user_id = au.user_id
  INNER JOIN Unit     ru ON lr.requester_unit_id  = ru.unit_id
  INNER JOIN Unit     su ON lr.supplier_unit_id   = su.unit_id
ORDER BY lr.RequestDate DESC;

-- Shows each requested item with its category
SELECT
  ri.request_id,
  au.user_name,
  i.item_name,
  c.category_name,
  ri.quantity_requested,
  i.CarbonFootprintPerUnit,
  (ri.quantity_requested * i.CarbonFootprintPerUnit * i.Weight) AS carbon_estimate
FROM Request_Item ri
  INNER JOIN Item     i  ON ri.item_id    = i.item_id
  INNER JOIN Category c  ON i.category_id = c.category_id
  INNER JOIN Logistics_Request lr ON ri.request_id = lr.request_id
  INNER JOIN App_User au ON lr.requester_user_id = au.user_id
ORDER BY ri.request_id, carbon_estimate DESC;

SELECT
  au.user_id,
  au.user_name,
  r.role_name,
  u.unit_name,
  COUNT(lr.request_id) AS total_requests
FROM App_User au
  LEFT JOIN Logistics_Request lr ON au.user_id = lr.requester_user_id
  INNER JOIN Role r ON au.role_id = r.role_id
  INNER JOIN Unit u ON au.unit_id = u.unit_id
GROUP BY au.user_id, au.user_name, r.role_name, u.unit_name
ORDER BY total_requests DESC;

-- Shows what each unit currently holds
SELECT
  u.unit_name,
  i.item_name,
  c.category_name,
  inv.Quantity,
  inv.ExpiryDate,
  inv.BatchNumber
FROM Inventory inv
  INNER JOIN Unit     u ON inv.unit_id    = u.unit_id
  INNER JOIN Item     i ON inv.item_id    = i.item_id
  INNER JOIN Category c ON i.category_id  = c.category_id
WHERE inv.Quantity > 0
ORDER BY u.unit_name, c.category_name;

SELECT
  u.unit_name,
  SUM(cal.TotalCarbonEmitted)  AS total_carbon_kg,
  u.totalCarbonBudget,
  (u.totalCarbonBudget - SUM(cal.TotalCarbonEmitted)) AS remaining_budget
FROM Carbon_Audit_Log cal
  INNER JOIN Logistics_Request lr ON cal.request_id    = lr.request_id
  INNER JOIN Unit              u  ON lr.requester_unit_id = u.unit_id
GROUP BY u.unit_id, u.unit_name, u.totalCarbonBudget
ORDER BY total_carbon_kg DESC;

SELECT
  Status,
  COUNT(*)                    AS request_count,
  COUNT(DISTINCT requester_unit_id) AS units_involved
FROM Logistics_Request
GROUP BY Status;

SELECT
  u.unit_name,
  u.totalCarbonBudget,
  SUM(cal.TotalCarbonEmitted) AS used_carbon
FROM Carbon_Audit_Log cal
  INNER JOIN Logistics_Request lr ON cal.request_id       = lr.request_id
  INNER JOIN Unit              u  ON lr.requester_unit_id = u.unit_id
GROUP BY u.unit_id, u.unit_name, u.totalCarbonBudget
HAVING SUM(cal.TotalCarbonEmitted) > (u.totalCarbonBudget * 0.5);

SELECT
  i.item_name,
  c.category_name,
  COUNT(ri.request_id)        AS times_ordered,
  SUM(ri.quantity_requested)  AS total_qty_requested,
  AVG(ri.quantity_requested)  AS avg_qty_per_order
FROM Request_Item ri
  INNER JOIN Item     i ON ri.item_id    = i.item_id
  INNER JOIN Category c ON i.category_id = c.category_id
GROUP BY i.item_id, i.item_name, c.category_name
ORDER BY total_qty_requested DESC;

-- Find items that have never appeared in any request
SELECT item_id, item_name
FROM Item
WHERE item_id NOT IN (
  SELECT DISTINCT item_id FROM Request_Item
);

SELECT user_name, total_reqs
FROM (
  SELECT au.user_id, au.user_name,
         COUNT(lr.request_id) AS total_reqs
  FROM App_User au
  LEFT JOIN Logistics_Request lr ON au.user_id = lr.requester_user_id
  GROUP BY au.user_id, au.user_name
) AS user_counts
WHERE total_reqs > (
  SELECT AVG(cnt) FROM (
    SELECT COUNT(request_id) AS cnt
    FROM Logistics_Request
    GROUP BY requester_user_id
  ) AS sub
);

-- Find inventory lots where quantity is below the average
-- for that same item across all units (correlated subquery)
SELECT
  inv.inv_id,
  u.unit_name,
  i.item_name,
  inv.Quantity AS current_qty
FROM Inventory inv
  INNER JOIN Unit u ON inv.unit_id = u.unit_id
  INNER JOIN Item i ON inv.item_id = i.item_id
WHERE inv.Quantity < (
  SELECT AVG(inv2.Quantity)
  FROM Inventory inv2
  WHERE inv2.item_id = inv.item_id  -- correlated: references outer query
);

SELECT
  u.unit_name,
  u.totalCarbonBudget,
  (SELECT COALESCE(SUM(cal.TotalCarbonEmitted), 0)
   FROM Carbon_Audit_Log cal
   INNER JOIN Logistics_Request lr ON cal.request_id = lr.request_id
   WHERE lr.requester_unit_id = u.unit_id
  ) AS carbon_used
FROM Unit u
ORDER BY carbon_used DESC;

CREATE OR REPLACE VIEW vw_PendingRequests AS
SELECT
  lr.request_id,
  au.user_name      AS requested_by,
  ru.unit_name      AS from_unit,
  su.unit_name      AS supplier,
  lr.RequestDate,
  COUNT(ri.item_id) AS item_count,
  SUM(ri.quantity_requested) AS total_units
FROM Logistics_Request lr
  INNER JOIN App_User au ON lr.requester_user_id = au.user_id
  INNER JOIN Unit     ru ON lr.requester_unit_id  = ru.unit_id
  INNER JOIN Unit     su ON lr.supplier_unit_id   = su.unit_id
  INNER JOIN Request_Item ri ON lr.request_id     = ri.request_id
WHERE lr.Status = 'PENDING'
GROUP BY lr.request_id, au.user_name, ru.unit_name, su.unit_name, lr.RequestDate;

-- Use it like a table:
SELECT * FROM vw_PendingRequests;

CREATE OR REPLACE VIEW vw_ExpiringInventory AS
SELECT
  inv.inv_id,
  u.unit_name,
  i.item_name,
  c.category_name,
  inv.Quantity,
  inv.ExpiryDate,
  DATEDIFF(inv.ExpiryDate, CURDATE()) AS days_until_expiry,
  inv.BatchNumber
FROM Inventory inv
  INNER JOIN Unit     u ON inv.unit_id    = u.unit_id
  INNER JOIN Item     i ON inv.item_id    = i.item_id
  INNER JOIN Category c ON i.category_id  = c.category_id
WHERE inv.ExpiryDate IS NOT NULL
  AND inv.ExpiryDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  AND inv.Quantity > 0
ORDER BY inv.ExpiryDate ASC;

-- Use it:
SELECT * FROM vw_ExpiringInventory;

CREATE OR REPLACE VIEW vw_CarbonSummary AS
SELECT
  u.unit_name,
  u.totalCarbonBudget,
  COALESCE(SUM(cal.TotalCarbonEmitted), 0)       AS carbon_used,
  ROUND(COALESCE(SUM(cal.TotalCarbonEmitted),0)
        / u.totalCarbonBudget * 100, 2)           AS pct_budget_used
FROM Unit u
  LEFT JOIN Logistics_Request lr  ON u.unit_id    = lr.requester_unit_id
  LEFT JOIN Carbon_Audit_Log  cal ON lr.request_id = cal.request_id
GROUP BY u.unit_id, u.unit_name, u.totalCarbonBudget;

-- Use it for a dashboard summary:
SELECT * FROM vw_CarbonSummary ORDER BY pct_budget_used DESC;

-- Check current state first
SELECT request_id, Status FROM Logistics_Request WHERE request_id = 2;

-- Approve it
UPDATE Logistics_Request
  SET Status = 'APPROVED'
WHERE request_id = 2
  AND Status = 'PENDING';     -- safety: only update if currently PENDING

-- Verify
SELECT request_id, Status FROM Logistics_Request WHERE request_id = 2;

-- Stocktake found 5 extra Medical Kits at Northern Command
UPDATE Inventory
  SET Quantity = Quantity + 5
WHERE unit_id = 2 AND item_id = 6
  AND ExpiryDate > CURDATE();  -- only update non-expired stock

-- Increase carbon budget for all units by 10%
UPDATE Unit
  SET totalCarbonBudget = totalCarbonBudget * 1.10
WHERE unit_id != 1;    -- Central Depot has no limit, skip it


-- Safe delete: only rows with zero quantity AND past expiry
SET SQL_SAFE_UPDATES = 0;

DELETE FROM Inventory
WHERE ExpiryDate < CURDATE()
  AND Quantity = 0;

SET SQL_SAFE_UPDATES = 1;


-- Request_Item has ON DELETE CASCADE, so line items auto-delete
DELETE FROM Logistics_Request
WHERE request_id = 4
  AND Status = 'REJECTED';   -- safety guard

-- Verify cascade worked:
SELECT * FROM Request_Item WHERE request_id = 4;  -- should return 0 rows



-- ============================================================
--  Defense Logistics IMS
--  Phase 5 -- PL/SQL Implementation
--  File: database/plsql.sql
--
--  Run AFTER schema.sql and seed.sql


USE defense_logistics_db;

-- ============================================================
-- SECTION 0: CLEAN UP (run if re-executing this file)
-- ============================================================

DROP TRIGGER  IF EXISTS trg_check_sustainability;
DROP TRIGGER  IF EXISTS trg_deduct_inventory;
DROP PROCEDURE IF EXISTS ApproveRequest;
DROP FUNCTION  IF EXISTS GetCarbonScore;
DROP PROCEDURE IF EXISTS ShowExpiringItems;


-- ============================================================
-- SECTION 1: TRIGGER 1 -- Sustainability Limit Check
-- Owner: Komal
-- Fires: BEFORE INSERT on Request_Item
-- Purpose: Block any INSERT where the quantity requested
--          exceeds the MaxQtyPerOrder for that user's role
--          and item category combination.
-- ============================================================

DELIMITER //

CREATE TRIGGER trg_check_sustainability
BEFORE INSERT ON Request_Item
FOR EACH ROW
BEGIN

    -- Step 1: declare variables to hold lookup results
    DECLARE v_role_id       INT;
    DECLARE v_category_id   INT;
    DECLARE v_max_qty       INT DEFAULT NULL;

    -- Step 2: get the role of the user who raised this request
    SELECT au.role_id
    INTO   v_role_id
    FROM   Logistics_Request lr
    JOIN   App_User au ON lr.requester_user_id = au.user_id
    WHERE  lr.request_id = NEW.request_id;

    -- Step 3: get the category of the item being requested
    SELECT category_id
    INTO   v_category_id
    FROM   Item
    WHERE  item_id = NEW.item_id;

    -- Step 4: look up the sustainability limit for this role + category
    SELECT MaxQtyPerOrder
    INTO   v_max_qty
    FROM   Sustainability_Limit
    WHERE  role_id     = v_role_id
    AND    category_id = v_category_id;

    -- Step 5: if a limit exists AND quantity exceeds it, block the insert
    IF v_max_qty IS NOT NULL AND NEW.quantity_requested > v_max_qty THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order quantity exceeds sustainability limit for this role and category';
    END IF;

END//

DELIMITER ;

-- TEST Trigger 1:
-- This should SUCCEED (10 rifles, limit is 15 for Field Officer / Weapons)
-- INSERT INTO Logistics_Request (requester_user_id, requester_unit_id, supplier_unit_id, Status)
--   VALUES (3, 2, 1, 'PENDING');
-- INSERT INTO Request_Item VALUES (LAST_INSERT_ID(), 1, 10);

-- This should FAIL (20 rifles, limit is 15)
-- INSERT INTO Logistics_Request (requester_user_id, requester_unit_id, supplier_unit_id, Status)
--   VALUES (3, 2, 1, 'PENDING');
-- INSERT INTO Request_Item VALUES (LAST_INSERT_ID(), 1, 20);


-- ============================================================
-- SECTION 2: FUNCTION -- GetCarbonScore
-- Purpose: Calculate total carbon emitted for a given request.
--          Formula: SUM(Weight x CarbonFootprintPerUnit x quantity_requested)
--          for every item in the request.
-- Called by: ApproveRequest procedure + direct SELECT queries
-- ============================================================

DELIMITER //

CREATE FUNCTION GetCarbonScore(p_request_id INT)
RETURNS DECIMAL(12, 4)
DETERMINISTIC
READS SQL DATA
BEGIN

    DECLARE v_score DECIMAL(12, 4) DEFAULT 0.0000;

    -- Sum up carbon contribution of every item in this request
    SELECT COALESCE(
               SUM(i.Weight * i.CarbonFootprintPerUnit * ri.quantity_requested),
               0.0000
           )
    INTO   v_score
    FROM   Request_Item ri
    JOIN   Item i ON ri.item_id = i.item_id
    WHERE  ri.request_id = p_request_id;

    RETURN v_score;

END//

DELIMITER ;

-- TEST Function:
-- SELECT GetCarbonScore(1) AS total_carbon_kg;
-- Should return the carbon score for request_id = 1


-- ============================================================
-- SECTION 3: TRIGGER 2 -- Inventory Deduction
-- Fires: AFTER INSERT on Inventory_Transaction
-- Purpose: Automatically deduct QtyMoved from the source
--          inventory record when a transaction is created.
--          Also enforces the expiry date constraint.
-- ============================================================

DELIMITER //

CREATE TRIGGER trg_deduct_inventory
AFTER INSERT ON Inventory_Transaction
FOR EACH ROW
BEGIN

    DECLARE v_expiry    DATE;
    DECLARE v_qty       INT;

    -- Step 1: get expiry date and current quantity of source inventory
    SELECT ExpiryDate, Quantity
    INTO   v_expiry, v_qty
    FROM   Inventory
    WHERE  inv_id = NEW.source_inv_id;

    -- Step 2: block if source inventory has expired
    IF v_expiry IS NOT NULL AND v_expiry < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot issue from an expired inventory lot';
    END IF;

    -- Step 3: block if insufficient stock
    IF v_qty < NEW.QtyMoved THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock in source inventory lot';
    END IF;

    -- Step 4: deduct the quantity
    UPDATE Inventory
    SET    Quantity = Quantity - NEW.QtyMoved
    WHERE  inv_id = NEW.source_inv_id;

END//

DELIMITER ;

-- TEST Trigger 2:
-- A valid insert should deduct stock automatically
-- INSERT INTO Inventory_Transaction (source_inv_id, request_id, QtyMoved)
--   VALUES (1, 1, 5);
-- Then check: SELECT Quantity FROM Inventory WHERE inv_id = 1;
-- Quantity should have decreased by 5


-- ============================================================
-- SECTION 4: STORED PROCEDURE -- ApproveRequest
-- Purpose: Approve a pending logistics request end-to-end:
--   1. Validate request exists and is PENDING
--   2. Update status to APPROVED
--   3. Create Inventory_Transaction (fires trg_deduct_inventory)
--   4. Calculate carbon score using GetCarbonScore()
--   5. Update TotalCarbonScore on the request
--   6. Insert into Carbon_Audit_Log
--   7. COMMIT everything or ROLLBACK on any error
-- Usage: CALL ApproveRequest(101);
-- ============================================================

DELIMITER //

CREATE PROCEDURE ApproveRequest(IN p_request_id INT)
BEGIN

    -- Declare variables
    DECLARE v_status        VARCHAR(20);
    DECLARE v_source_inv    INT;
    DECLARE v_qty_needed    INT;
    DECLARE v_carbon_score  DECIMAL(12, 4);
    DECLARE v_error_msg     VARCHAR(255);

    -- Exception handler: on any SQL error, rollback and show message
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Begin atomic transaction
    START TRANSACTION;

    -- Step 1: Check that the request exists and is PENDING
    SELECT Status
    INTO   v_status
    FROM   Logistics_Request
    WHERE  request_id = p_request_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Request not found';
    END IF;

    IF v_status != 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only PENDING requests can be approved';
    END IF;

    -- Step 2: Update request status to APPROVED
    UPDATE Logistics_Request
    SET    Status = 'APPROVED'
    WHERE  request_id = p_request_id;
    
    SAVEPOINT after_status_update; 

    -- Step 3: Find the source inventory to fulfill from
    -- We use the first matching inventory row in the supplier unit
    -- with sufficient stock and no expiry issue
    SELECT inv.inv_id,
           SUM(ri.quantity_requested) AS total_qty
    INTO   v_source_inv, v_qty_needed
    FROM   Logistics_Request lr
    JOIN   Request_Item ri   ON lr.request_id   = ri.request_id
    JOIN   Inventory    inv  ON inv.unit_id      = lr.supplier_unit_id
                             AND inv.item_id     = ri.item_id
    WHERE  lr.request_id  = p_request_id
    AND    inv.Quantity   >= ri.quantity_requested
    AND    (inv.ExpiryDate IS NULL OR inv.ExpiryDate >= CURDATE())
    LIMIT  1;

    IF v_source_inv IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No valid inventory found to fulfill this request';
    END IF;

    -- Step 4: Create the inventory transaction
    -- UNIQUE constraint on request_id prevents duplicate approvals
    -- trg_deduct_inventory fires automatically after this INSERT
    INSERT INTO Inventory_Transaction
        (source_inv_id, request_id, QtyMoved, TransactionDate)
    VALUES
        (v_source_inv, p_request_id, v_qty_needed, CURDATE());
    
    SAVEPOINT after_fulfillment;


    -- Step 5: Calculate carbon score using the function
    SET v_carbon_score = GetCarbonScore(p_request_id);

    -- Step 6: Store carbon score on the request
    UPDATE Logistics_Request
    SET    TotalCarbonScore = v_carbon_score
    WHERE  request_id = p_request_id;

    -- Step 7: Log to carbon audit
    INSERT INTO Carbon_Audit_Log
        (request_id, TotalCarbonEmitted, DateCalculated)
    VALUES
        (p_request_id, v_carbon_score, CURDATE());

    -- Step 8: Commit everything
    COMMIT;

    -- Return a confirmation message
    SELECT CONCAT('Request ', p_request_id, ' approved. Carbon score: ',
                   v_carbon_score, ' kg CO2') AS result;

END//

DELIMITER ;

-- TEST Procedure:
-- CALL ApproveRequest(2);
-- Then verify:
-- SELECT status, TotalCarbonScore FROM Logistics_Request WHERE request_id = 2;
-- SELECT * FROM Carbon_Audit_Log WHERE request_id = 2;
-- SELECT * FROM Inventory_Transaction WHERE request_id = 2;


-- ============================================================
-- SECTION 5: CURSOR -- ShowExpiringItems
-- Purpose: Loop through all inventory items expiring within
--          30 days and display unit, item, quantity,
--          expiry date, and days remaining.
-- Shows: explicit cursor with FETCH + LOOP + CLOSE
-- Usage: CALL ShowExpiringItems();
-- ============================================================

DELIMITER //

CREATE PROCEDURE ShowExpiringItems()
BEGIN

    -- Variables to hold each fetched row
    DECLARE v_unit_name     VARCHAR(150);
    DECLARE v_item_name     VARCHAR(150);
    DECLARE v_quantity      INT;
    DECLARE v_expiry        DATE;
    DECLARE v_days_left     INT;
    DECLARE v_done          INT DEFAULT FALSE;

    -- Declare the explicit cursor
    DECLARE c_expiring CURSOR FOR
        SELECT
            u.unit_name,
            i.item_name,
            inv.Quantity,
            inv.ExpiryDate,
            DATEDIFF(inv.ExpiryDate, CURDATE()) AS days_remaining
        FROM  Inventory inv
        JOIN  Unit u ON inv.unit_id   = u.unit_id
        JOIN  Item i ON inv.item_id   = i.item_id
        WHERE inv.ExpiryDate IS NOT NULL
        AND   inv.ExpiryDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND   inv.Quantity > 0
        ORDER BY inv.ExpiryDate ASC;

    -- Handler: sets v_done = TRUE when no more rows
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Open the cursor
    OPEN c_expiring;

    -- Create a results table to display output
    DROP TEMPORARY TABLE IF EXISTS tmp_expiring_results;
    CREATE TEMPORARY TABLE tmp_expiring_results (
        unit_name     VARCHAR(150),
        item_name     VARCHAR(150),
        quantity      INT,
        expiry_date   DATE,
        days_left     INT
    );

    -- Loop: FETCH each row until done
    fetch_loop: LOOP
        FETCH c_expiring
        INTO  v_unit_name, v_item_name, v_quantity, v_expiry, v_days_left;

        -- Exit loop when no more rows
        IF v_done THEN
            LEAVE fetch_loop;
        END IF;

        -- Insert fetched row into temp table
        INSERT INTO tmp_expiring_results
        VALUES (v_unit_name, v_item_name, v_quantity, v_expiry, v_days_left);

    END LOOP;

    -- Close the cursor
    CLOSE c_expiring;

    -- Display results
    SELECT * FROM tmp_expiring_results
    ORDER BY days_left ASC;

    -- Clean up temp table
    DROP TEMPORARY TABLE IF EXISTS tmp_expiring_results;

END//

DELIMITER ;

-- TEST Cursor:
-- CALL ShowExpiringItems();
-- Should show the Medical Kit row with ExpiryDate '2026-06-30'
-- from Northern Command (inv_id 12 in seed data)


-- ============================================================
-- SECTION 6: VERIFY ALL COMPONENTS WERE CREATED
-- ============================================================

-- Check all triggers
SHOW TRIGGERS FROM defense_logistics_db;

-- Check all procedures and functions
SHOW PROCEDURE STATUS WHERE Db = 'defense_logistics_db';
SHOW FUNCTION  STATUS WHERE Db = 'defense_logistics_db';

-- ============================================================
-- END OF plsql.sql
-- ============================================================

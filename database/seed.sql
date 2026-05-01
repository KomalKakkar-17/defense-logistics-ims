use defense_logistics_db;
INSERT INTO Category (category_name, isHazardous, RecycleProtocol) VALUES
  ('Weapons',      TRUE,  'Incinerate'),
  ('Vehicles',     FALSE, 'Maintain and Repurpose'),
  ('Medical',      FALSE, 'Dispose as Medical Waste'),
  ('Electronics',  FALSE, 'E-Waste Recycling'),
  ('Ammunition',   TRUE,  'Controlled Detonation');
INSERT INTO Item (item_name, category_id, Weight, CarbonFootprintPerUnit) VALUES
  ('AK-47 Rifle',        1, 4.20,   0.9100),
  ('Sniper Rifle',       1, 5.80,   1.1200),
  ('Combat Knife',       1, 0.35,   0.0500),
  ('Army Truck',         2, 8000.00,4.5000),
  ('Armoured Jeep',      2, 2200.00,2.8000),
  ('Medical Kit',        3, 2.10,   0.1800),
  ('Field Radio',        4, 1.50,   0.6500),
  ('Night Vision Goggle',4, 0.80,   0.4200),
  ('9mm Ammo Box',       5, 5.00,   0.3800),
  ('Grenade',            5, 0.45,   0.2200);

INSERT INTO Unit (unit_name, location, totalCarbonBudget, MaxCapacity) VALUES
  ('Central Depot Delhi',     'New Delhi',         50000.00, 10000),
  ('Northern Command',        'Pathankot, Punjab',  5000.00,  2000),
  ('Southern Command',        'Chennai, Tamil Nadu',4000.00,  1800),
  ('Eastern Command',         'Kolkata, West Bengal',3500.00, 1500),
  ('Western Command',         'Jaipur, Rajasthan',  4500.00,  2200);

INSERT INTO Role (role_name, ClearanceLevel) VALUES
  ('Commanding Officer', 5),
  ('Admin Officer',      4),
  ('Field Officer',      3),
  ('Logistics Staff',    2),
  ('Observer',           1);

INSERT INTO App_User (user_name, contact_number, email, role_id, unit_id) VALUES
  ('Komal Kakkar',  '9876543210', 'komal@army.in',  2, 3),
  ('Hiten Singla',  '9876543211', 'hiten@army.in',  1, 1),
  ('Raunak Yadav',  '9876543212', 'raunak@army.in', 3, 2),
  ('Arjun Mehta',   '9876543213', 'arjun@army.in',  3, 4),
  ('Priya Sharma',  '9876543214', 'priya@army.in',  4, 5),
  ('Vikram Bose',   '9876543215', 'vikram@army.in', 2, 2),
  ('Neha Gupta',    '9876543216', 'neha@army.in',   4, 3),
  ('Raj Kumar',     '9876543217', 'raj@army.in',    5, 1);

INSERT INTO Inventory (unit_id, item_id, Quantity, ExpiryDate, BatchNumber) VALUES
  (1, 1, 200, NULL,         'WPN-2024-AK'),
  (1, 2, 50,  NULL,         'WPN-2024-SR'),
  (1, 3, 500, NULL,         'WPN-2024-CK'),
  (1, 4, 30,  NULL,         'VEH-2023-TRK'),
  (1, 5, 40,  NULL,         'VEH-2023-JEP'),
  (1, 6, 300, '2027-12-31', 'MED-2024-KIT'),
  (1, 7, 80,  '2028-06-30', 'ELC-2024-RAD'),
  (1, 8, 120, NULL,         'ELC-2024-NVG'),
  (1, 9, 1000,NULL,         'AMO-2024-9MM'),
  (1,10, 400, NULL,         'AMO-2024-GRN'),
  -- Northern Command existing stock
  (2, 1, 20,  NULL,         'WPN-NC-001'),
  (2, 6, 50,  '2026-06-30', 'MED-NC-001'),
  -- Expired item for testing expiry constraint
  (2, 6, 10,  '2025-01-01', 'MED-NC-EXP');


-- Limits per role per category: (role_id, category_id, MaxQtyPerOrder, MaxQtyPerMonth)
INSERT INTO Sustainability_Limit
  (role_id, category_id, MaxQtyPerOrder, MaxQtyPerMonth) VALUES
  (3, 1, 15,  40),   -- Field Officer:  Weapons   max 15/order
  (3, 2, 3,   8),    -- Field Officer:  Vehicles  max  3/order
  (3, 3, 50,  150),  -- Field Officer:  Medical   max 50/order
  (3, 4, 10,  25),   -- Field Officer:  Electronics max 10/order
  (3, 5, 100, 300),  -- Field Officer:  Ammo      max 100/order
  (2, 1, 50,  150),  -- Admin Officer:  Weapons   max 50/order
  (2, 2, 10,  30),   -- Admin Officer:  Vehicles  max 10/order
  (2, 3, 200, 600),  -- Admin Officer:  Medical   max 200/order
  (1, 1, 200, 500),  -- Cmd Officer:   Weapons   max 200/order
  (1, 2, 30,  80),   -- Cmd Officer:   Vehicles  max 30/order
  (4, 3, 30,  90),   -- Logistics:     Medical   max 30/order
  (4, 4, 20,  60);   -- Logistics:     Electronics max 20/order


-- Request 1: Raunak (Field Officer, Northern Command) asks Central Depot
INSERT INTO Logistics_Request
  (requester_user_id, requester_unit_id, supplier_unit_id, Status, RequestDate)
  VALUES (3, 2, 1, 'APPROVED', '2026-03-10');

INSERT INTO Request_Item VALUES (1, 1, 10); -- 10 AK-47 Rifles
INSERT INTO Request_Item VALUES (1, 5, 2);  -- 2 Armoured Jeeps

-- Request 2: Arjun (Field Officer, Eastern Command)
INSERT INTO Logistics_Request
  (requester_user_id, requester_unit_id, supplier_unit_id, Status, RequestDate)
  VALUES (4, 4, 1, 'PENDING', '2026-03-15');

INSERT INTO Request_Item VALUES (2, 6, 20); -- 20 Medical Kits
INSERT INTO Request_Item VALUES (2, 7, 5);  -- 5 Field Radios

-- Request 3: Komal (Admin Officer, Southern Command)
INSERT INTO Logistics_Request
  (requester_user_id, requester_unit_id, supplier_unit_id, Status, RequestDate)
  VALUES (1, 3, 1, 'PENDING', '2026-04-01');

INSERT INTO Request_Item VALUES (3, 4, 3);  -- 3 Army Trucks
INSERT INTO Request_Item VALUES (3, 9, 50); -- 50 Ammo Boxes

-- Request 4: Priya (Logistics Staff, Western Command)
INSERT INTO Logistics_Request
  (requester_user_id, requester_unit_id, supplier_unit_id, Status, RequestDate)
  VALUES (5, 5, 1, 'REJECTED', '2026-04-05');

INSERT INTO Request_Item VALUES (4, 8, 15); -- 15 Night Vision

-- Only Request 1 is APPROVED -- create its transaction
INSERT INTO Inventory_Transaction
  (source_inv_id, request_id, QtyMoved, TransactionDate)
  VALUES (1, 1, 10, '2026-03-11'); -- Rifles moved from inv_id 1

-- Update inventory stock accordingly
UPDATE Inventory SET Quantity = Quantity - 10 WHERE inv_id = 1;
UPDATE Inventory SET Quantity = Quantity - 2  WHERE inv_id = 5;

-- Log carbon for the approved request
-- AK-47: 4.20 * 0.9100 * 10 = 38.22
-- Armoured Jeep: 2200 * 2.8000 * 2 = 12320.00
-- Total = 12358.22
INSERT INTO Carbon_Audit_Log
  (request_id, TotalCarbonEmitted, DateCalculated)
  VALUES (1, 12358.22, '2026-03-11');

UPDATE Logistics_Request
  SET TotalCarbonScore = 12358.22 WHERE request_id = 1;
  
  
  
  
  
  
  
  
  
  
  
  
  
  USE defense_logistics_db;

-- ─────────────────────────────────────────────
-- Category  (currently 5 rows → add 5 more → 10)
-- ─────────────────────────────────────────────
INSERT INTO Category (category_name, isHazardous, RecycleProtocol) VALUES
  ('Explosives',       TRUE,  'Controlled Detonation'),
  ('Surveillance',     FALSE, 'E-Waste Recycling'),
  ('Clothing & Gear',  FALSE, 'Donate or Repurpose'),
  ('Fuel & Energy',    TRUE,  'Hazardous Liquid Disposal'),
  ('Communication',    FALSE, 'E-Waste Recycling');

-- ─────────────────────────────────────────────
-- Item  (currently 10 rows → add 2 more → 12)
-- ─────────────────────────────────────────────
INSERT INTO Item (item_name, category_id, Weight, CarbonFootprintPerUnit) VALUES
  ('Drone Scout',        6, 1.20,  0.8500),   -- category 6 = Surveillance
  ('Combat Boots (pair)',7, 1.80,  0.1200);   -- category 7 = Clothing & Gear

-- ─────────────────────────────────────────────
-- Unit  (currently 5 rows → add 5 more → 10)
-- ─────────────────────────────────────────────
INSERT INTO Unit (unit_name, location, totalCarbonBudget, MaxCapacity) VALUES
  ('South-West Command',  'Ahmedabad, Gujarat',       4200.00, 1900),
  ('Andaman Base',        'Port Blair, Andaman',      2000.00,  800),
  ('North-East Command',  'Guwahati, Assam',          3000.00, 1400),
  ('Forward Base Alpha',  'Leh, Ladakh',              1500.00,  600),
  ('Coastal Guard Post',  'Kochi, Kerala',            2500.00, 1100);

-- ─────────────────────────────────────────────
-- Role  (currently 5 rows → add 5 more → 10)
-- ─────────────────────────────────────────────
INSERT INTO Role (role_name, ClearanceLevel) VALUES
  ('Senior Commanding Officer', 6),
  ('Intelligence Officer',      5),
  ('Supply Chain Manager',      3),
  ('Maintenance Technician',    2),
  ('Trainee',                   1);

-- ─────────────────────────────────────────────
-- App_User  (currently 8 rows → add 4 more → 12)
-- ─────────────────────────────────────────────
INSERT INTO App_User (user_name, contact_number, email, role_id, unit_id) VALUES
  ('Aditya Verma',  '9876543218', 'aditya@army.in',  3, 6),   -- Field Officer, SW Command
  ('Sunita Rao',    '9876543219', 'sunita@army.in',  4, 7),   -- Logistics, Andaman
  ('Manish Tiwari', '9876543220', 'manish@army.in',  1, 8),   -- Cmd Officer, NE Command
  ('Deepa Nair',    '9876543221', 'deepa@army.in',   2, 9);   -- Admin Officer, Fwd Base Alpha

-- ─────────────────────────────────────────────
-- Inventory  (currently 13 rows → add 2 more → target ~12 unique meaningful entries)
-- Adding stock for new units
-- ─────────────────────────────────────────────
INSERT INTO Inventory (unit_id, item_id, Quantity, ExpiryDate, BatchNumber) VALUES
  (6,  1, 30,  NULL,         'WPN-SWC-001'),  -- SW Command: AK-47s
  (6,  6, 60,  '2027-09-30', 'MED-SWC-001'),  -- SW Command: Medical Kits
  (7,  8, 25,  NULL,         'ELC-AND-001'),  -- Andaman: Night Vision
  (8,  7, 40,  '2028-01-31', 'ELC-NEC-001'),  -- NE Command: Field Radios
  (9,  3, 150, NULL,         'WPN-FBA-001'),  -- Fwd Base Alpha: Combat Knives
  (9, 11,  20, NULL,         'SUR-FBA-001'),  -- Fwd Base Alpha: Drone Scouts
  (10, 6, 80,  '2027-03-31', 'MED-CGP-001'),  -- Coastal Guard Post: Medical Kits
  (10, 9, 500, NULL,         'AMO-CGP-001');  -- Coastal Guard Post: 9mm Ammo

-- ─────────────────────────────────────────────
-- Sustainability_Limit  (currently 12 rows → add 2 more → close to 14 / trim to ~12)
-- Adding limits for new roles
-- ─────────────────────────────────────────────
INSERT INTO Sustainability_Limit
  (role_id, category_id, MaxQtyPerOrder, MaxQtyPerMonth) VALUES
  (6, 1, 30,  80),    -- Supply Chain Manager: Weapons
  (6, 3, 100, 300);   -- Supply Chain Manager: Medical

-- ─────────────────────────────────────────────
-- Logistics_Request  (currently 4 rows → add 6 more → 10)
-- ─────────────────────────────────────────────
INSERT INTO Logistics_Request
  (requester_user_id, requester_unit_id, supplier_unit_id, Status, RequestDate) VALUES
  ( 9, 6, 1, 'APPROVED', '2026-04-10'),   -- Aditya (SW Command) ← Central Depot
  (10, 7, 1, 'PENDING',  '2026-04-12'),   -- Sunita (Andaman)    ← Central Depot
  (11, 8, 1, 'APPROVED', '2026-04-14'),   -- Manish (NE Command) ← Central Depot
  (12, 9, 1, 'PENDING',  '2026-04-18'),   -- Deepa  (Fwd Base Alpha) ← Central Depot
  ( 3, 2, 6, 'PENDING',  '2026-04-20'),   -- Raunak (Northern)   ← SW Command
  ( 1, 3, 2, 'REJECTED', '2026-04-22');   -- Komal  (Southern)   ← Northern Command

-- ─────────────────────────────────────────────
-- Request_Item  — items for the 6 new requests
-- ─────────────────────────────────────────────
INSERT INTO Request_Item VALUES
  (5,  1, 15),   -- Req 5: 15 AK-47 Rifles
  (5,  6, 30),   -- Req 5: 30 Medical Kits
  (6,  8, 10),   -- Req 6: 10 Night Vision Goggles
  (6,  7,  5),   -- Req 6:  5 Field Radios
  (7,  4,  5),   -- Req 7:  5 Army Trucks
  (7,  9,200),   -- Req 7: 200 Ammo Boxes
  (8, 11, 10),   -- Req 8: 10 Drone Scouts
  (9,  3, 50),   -- Req 9: 50 Combat Knives
  (10, 6, 40);   -- Req 10: 40 Medical Kits

-- ─────────────────────────────────────────────
-- Inventory_Transaction  (currently 1 row → add 3 more → 4, for approved requests)
-- Req 5 (APPROVED): AK-47s from Central Depot (inv_id=1)
-- Req 7 (APPROVED): Army Trucks from Central Depot (inv_id=4)
-- ─────────────────────────────────────────────
INSERT INTO Inventory_Transaction
  (source_inv_id, request_id, QtyMoved, TransactionDate) VALUES
  (1,  5, 15, '2026-04-11'),   -- AK-47s for SW Command
  (6,  5, 30, '2026-04-11'),   -- Medical Kits for SW Command
  (4,  7,  5, '2026-04-15'),   -- Army Trucks for NE Command
  (9,  7,200, '2026-04-15');   -- Ammo Boxes for NE Command

-- Adjust inventory for those fulfilled transactions
UPDATE Inventory SET Quantity = Quantity - 15  WHERE inv_id = 1;  -- AK-47 at Central Depot
UPDATE Inventory SET Quantity = Quantity - 30  WHERE inv_id = 6;  -- Medical Kits at Central Depot
UPDATE Inventory SET Quantity = Quantity - 5   WHERE inv_id = 4;  -- Army Trucks at Central Depot
UPDATE Inventory SET Quantity = Quantity - 200 WHERE inv_id = 9;  -- 9mm Ammo at Central Depot

-- ─────────────────────────────────────────────
-- Carbon_Audit_Log  (currently 1 row → add 3 more → 4, matching approved requests)
-- Req 5:  AK-47: 4.20*0.91*15 = 57.33 | Medical: 2.10*0.18*30 = 11.34 → Total = 68.67
-- Req 7:  Army Truck: 8000*4.50*5 = 180000 | 9mm: 5.00*0.38*200 = 380 → Total = 180380.00
-- ─────────────────────────────────────────────
INSERT INTO Carbon_Audit_Log
  (request_id, TotalCarbonEmitted, DateCalculated) VALUES
  (5,    68.67, '2026-04-11'),
  (7, 180380.00, '2026-04-15');

UPDATE Logistics_Request SET TotalCarbonScore =    68.67 WHERE request_id = 5;
UPDATE Logistics_Request SET TotalCarbonScore = 180380.00 WHERE request_id = 7;
CREATE DATABASE IF NOT EXISTS defense_logistics_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

use defense_logistics_db;
CREATE TABLE Category (
  category_id       INT            NOT NULL AUTO_INCREMENT,
  category_name     VARCHAR(100)   NOT NULL,
  isHazardous       BOOLEAN        NOT NULL DEFAULT FALSE,
  RecycleProtocol   VARCHAR(100),
  CONSTRAINT pk_category  PRIMARY KEY (category_id),
  CONSTRAINT uq_cat_name  UNIQUE      (category_name)
);
CREATE TABLE Item (
  item_id                INT              NOT NULL AUTO_INCREMENT,
  item_name              VARCHAR(150)     NOT NULL,
  category_id            INT              NOT NULL,
  Weight                 DECIMAL(8,2)     NOT NULL,
  CarbonFootprintPerUnit DECIMAL(10,4)    NOT NULL DEFAULT 0.0000,
  CONSTRAINT pk_item     PRIMARY KEY (item_id),
  CONSTRAINT fk_item_cat FOREIGN KEY (category_id)
             REFERENCES Category(category_id)
             ON DELETE RESTRICT
             ON UPDATE CASCADE
);
CREATE TABLE Unit (
  unit_id            INT              NOT NULL AUTO_INCREMENT,
  unit_name          VARCHAR(150)     NOT NULL,
  location           VARCHAR(200),
  totalCarbonBudget  DECIMAL(12,2)    DEFAULT 5000.00,
  MaxCapacity        INT              DEFAULT 2000,
  CONSTRAINT pk_unit      PRIMARY KEY (unit_id),
  CONSTRAINT uq_unit_name UNIQUE      (unit_name)
);
CREATE TABLE Role (
  role_id         INT           NOT NULL AUTO_INCREMENT,
  role_name       VARCHAR(100)  NOT NULL,
  ClearanceLevel  INT           NOT NULL,
  CONSTRAINT pk_role      PRIMARY KEY (role_id),
  CONSTRAINT uq_role_name UNIQUE      (role_name),
  CONSTRAINT ck_clearance CHECK       (ClearanceLevel BETWEEN 1 AND 5)
);
CREATE TABLE App_User (
  user_id         INT           NOT NULL AUTO_INCREMENT,
  user_name       VARCHAR(150)  NOT NULL,
  contact_number  VARCHAR(15),
  email           VARCHAR(200)  NOT NULL,
  role_id         INT           NOT NULL,
  unit_id         INT           NOT NULL,
  CONSTRAINT pk_user      PRIMARY KEY (user_id),
  CONSTRAINT uq_email     UNIQUE      (email),
  CONSTRAINT uq_contact   UNIQUE      (contact_number),
  CONSTRAINT fk_user_role FOREIGN KEY (role_id)
             REFERENCES Role(role_id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_unit FOREIGN KEY (unit_id)
             REFERENCES Unit(unit_id) ON DELETE RESTRICT
);
CREATE TABLE Inventory (
  inv_id       INT           NOT NULL AUTO_INCREMENT,
  unit_id      INT           NOT NULL,
  item_id      INT           NOT NULL,
  Quantity     INT           NOT NULL DEFAULT 0,
  ExpiryDate   DATE,
  BatchNumber  VARCHAR(50),
  CONSTRAINT pk_inventory   PRIMARY KEY (inv_id),
  CONSTRAINT fk_inv_unit    FOREIGN KEY (unit_id)
             REFERENCES Unit(unit_id) ON DELETE RESTRICT,
  CONSTRAINT fk_inv_item    FOREIGN KEY (item_id)
             REFERENCES Item(item_id) ON DELETE RESTRICT,
  CONSTRAINT ck_inv_qty     CHECK       (Quantity >= 0)
);
CREATE TABLE Logistics_Request (
  request_id          INT           NOT NULL AUTO_INCREMENT,
  requester_user_id   INT           NOT NULL,
  requester_unit_id   INT           NOT NULL,
  supplier_unit_id    INT           NOT NULL,
  Status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  TotalCarbonScore    DECIMAL(12,4) DEFAULT 0.0000,
  RequestDate         DATE          NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT pk_request       PRIMARY KEY (request_id),
  CONSTRAINT ck_status        CHECK       (Status IN ('PENDING','APPROVED','REJECTED')),
  CONSTRAINT fk_req_user      FOREIGN KEY (requester_user_id)
             REFERENCES App_User(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_req_unit      FOREIGN KEY (requester_unit_id)
             REFERENCES Unit(unit_id) ON DELETE RESTRICT,
  CONSTRAINT fk_sup_unit      FOREIGN KEY (supplier_unit_id)
             REFERENCES Unit(unit_id) ON DELETE RESTRICT
);
CREATE TABLE Request_Item (
  request_id          INT   NOT NULL,
  item_id             INT   NOT NULL,
  quantity_requested  INT   NOT NULL,
  CONSTRAINT pk_req_item  PRIMARY KEY (request_id, item_id),
  CONSTRAINT ck_qty_pos   CHECK       (quantity_requested > 0),
  CONSTRAINT fk_ri_req    FOREIGN KEY (request_id)
             REFERENCES Logistics_Request(request_id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_item   FOREIGN KEY (item_id)
             REFERENCES Item(item_id) ON DELETE RESTRICT
);
CREATE TABLE Inventory_Transaction (
  transaction_id   INT   NOT NULL AUTO_INCREMENT,
  source_inv_id    INT   NOT NULL,
  request_id       INT   NOT NULL,
  QtyMoved         INT   NOT NULL,
  TransactionDate  DATE  NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT pk_txn         PRIMARY KEY (transaction_id),
  CONSTRAINT uq_txn_req     UNIQUE      (request_id),
  CONSTRAINT ck_qty_moved   CHECK       (QtyMoved > 0),
  CONSTRAINT fk_txn_inv     FOREIGN KEY (source_inv_id)
             REFERENCES Inventory(inv_id) ON DELETE RESTRICT,
  CONSTRAINT fk_txn_req     FOREIGN KEY (request_id)
             REFERENCES Logistics_Request(request_id) ON DELETE RESTRICT
);
CREATE TABLE Sustainability_Limit (
  limit_id          INT   NOT NULL AUTO_INCREMENT,
  role_id           INT   NOT NULL,
  category_id       INT   NOT NULL,
  MaxQtyPerOrder    INT   NOT NULL,
  MaxQtyPerMonth    INT   NOT NULL,
  CONSTRAINT pk_sus_limit    PRIMARY KEY (limit_id),
  CONSTRAINT uq_role_cat     UNIQUE      (role_id, category_id),
  CONSTRAINT ck_max_order    CHECK       (MaxQtyPerOrder > 0),
  CONSTRAINT ck_max_month    CHECK       (MaxQtyPerMonth > 0),
  CONSTRAINT fk_sl_role      FOREIGN KEY (role_id)
             REFERENCES Role(role_id) ON DELETE CASCADE,
  CONSTRAINT fk_sl_cat       FOREIGN KEY (category_id)
             REFERENCES Category(category_id) ON DELETE CASCADE
);
CREATE TABLE Carbon_Audit_Log (
  log_id                INT              NOT NULL AUTO_INCREMENT,
  request_id            INT              NOT NULL,
  TotalCarbonEmitted    DECIMAL(12,4)    NOT NULL,
  DateCalculated        DATE             NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT pk_cal         PRIMARY KEY (log_id),
  CONSTRAINT fk_cal_req     FOREIGN KEY (request_id)
             REFERENCES Logistics_Request(request_id) ON DELETE RESTRICT
);
ALTER TABLE App_User
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE Logistics_Request
  ADD COLUMN Priority VARCHAR(10) DEFAULT 'NORMAL';

ALTER TABLE Logistics_Request
  ADD CONSTRAINT ck_priority
  CHECK (Priority IN ('LOW','NORMAL','HIGH','CRITICAL'));

ALTER TABLE App_User
  MODIFY COLUMN user_name VARCHAR(200) NOT NULL;





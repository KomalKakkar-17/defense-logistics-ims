# Defense Logistics Inventory Management System


A centralized, database-driven inventory management system for defense logistics — tracking weapons, vehicles, medical supplies, and equipment across military units, with built-in sustainability controls and carbon audit logging.

---

## Team

| Name | GitHub Branch |
|------|--------------|
| Komal Kakkar (1024030872) | `feature/komal` | 
| Hiten Singla (1024030877) | `feature/hiten` | 
| Raunak Yadav (1024030934) | `feature/raunak` | 

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MySQL 8.0 |
| Backend | Node.js + Express.js |
| Frontend | React.js |
| DB Driver | mysql2 |
| Version Control | Git + GitHub |

---

## Repository Structure

```
defense-logistics-ims/
│
├── database/
│   ├── schema.sql        ← Phase 3: All 11 CREATE TABLE statements + constraints
│   ├── seed.sql          ← Phase 4: All INSERT data (realistic Green Defense scenario)
│   ├── queries.sql       ← Phase 4: Joins, aggregates, subqueries, views, UPDATE, DELETE
│   ├── plsql.sql         ← Phase 5: Triggers, stored procedure, function, cursor
│   └── README.md         ← How to set up the database
│
├── backend/
│   ├── server.js         ← Express entry point (port 5000)
│   ├── .env.example      ← Environment variable template (copy to .env)
│   ├── db/
│   │   └── connection.js ← mysql2 connection pool
│   └── routes/
│       ├── auth.js       ← POST /api/login
│       ├── requests.js   ← GET + POST /api/requests
│       ├── inventory.js  ← GET /api/inventory
│       ├── approve.js    ← PATCH /api/requests/:id/approve
│       └── carbon.js     ← GET /api/carbon
│
├── frontend/
│   └── src/
│       ├── App.js
│       ├── api.js        ← All fetch() calls centralised here
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── NewRequest.jsx
│           ├── Inventory.jsx
│           ├── Approve.jsx
│           └── CarbonReport.jsx
│
├── .gitignore
├── README.md             ← This file
└── TECHNICAL_DOC.md      ← Full system documentation
```

---

## Branch Strategy

We use **three feature branches** — one per team member — that merge into `dev`, which merges into `main` only when a phase is fully complete and tested.

```
main          ← stable, submission-ready only
  └── dev     ← integration branch, always working
        ├── feature/komal   ← Komal's work
        ├── feature/hiten   ← Hiten's work
        └── feature/raunak  ← Raunak's work
```

**Rules:**
- Never commit directly to `main`
- Never commit directly to `dev` — always go through your feature branch
- Put merge request of your feature branch into `dev` only when your section is tested and working
- One person (Komal) handles merges from `dev` → `main` at the end of each phase

---

## Prerequisites

Install these before anything else:

1. **MySQL 8.0** — `dev.mysql.com/downloads/mysql`
2. **MySQL Workbench 8.0** — `dev.mysql.com/downloads/workbench`
3. **Node.js 18+** — `nodejs.org` (comes with npm)
4. **VS Code** — `code.visualstudio.com`
5. **Git** — `git-scm.com`

Recommended VS Code extensions:
- `SQLTools` + `SQLTools MySQL/MariaDB` — run SQL from VS Code
- `ES7+ React/Redux/React-Native snippets`
- `Prettier`

---

## Setup — Step by Step

### 1. Clone the repository

```bash
git clone https://github.com/KomalKakkar-17/defense-logistics-ims.git
cd defense-logistics-ims
```

### 2. Switch to your branch

```bash
# Komal
git checkout feature/komal

# Hiten
git checkout feature/hiten

# Raunak
git checkout feature/raunak
```

### 3. Set up the database

Open **MySQL Workbench** → connect to localhost → open a new query tab → run in this order:

```sql
-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS defense_logistics_db;
USE defense_logistics_db;

-- Step 2: Run schema (creates all 11 tables)
-- Copy contents of database/schema.sql and run

-- Step 3: Run seed data
-- Copy contents of database/seed.sql and run

-- Step 4: Verify
SHOW TABLES;
-- Should show all 11 tables
```

### 4. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=defense_logistics_db
PORT=5000
```

Start the backend:

```bash
npx nodemon server.js
# Running on http://localhost:5000
```

### 5. Set up the frontend

```bash
cd ../frontend
npm install
npm start
# Running on http://localhost:3000
```

### 6. Verify everything works

Open browser → `http://localhost:3000` → login page should appear.
Backend health check → `http://localhost:5000/api/health` → should return `{ status: "ok" }`.

---

## Daily Git Workflow

Every time you sit down to work:

```bash
# 1. Pull latest changes from dev into your branch
git checkout feature/your-name
git pull origin dev

# 2. Do your work, then stage and commit
git add .
git commit -m "phase3: add CREATE TABLE for App_User with FK constraints"

# 3. Push your branch
git push origin feature/your-name
```

When a section is complete and tested, open a **Pull Request** on GitHub: `feature/your-name` → `dev`.

### Commit message format

```
phase3: add schema for sustainability tables
phase4: add join queries for request details
phase5: add sustainability limit trigger
frontend: add NewRequest form component
backend: add approve route with transaction handling
fix: correct FK order in schema.sql
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASS` | MySQL password | `yourpassword` |
| `DB_NAME` | Database name | `defense_logistics_db` |
| `PORT` | Backend server port | `5000` |

> **Never commit `.env`** — it is in `.gitignore`. Share credentials with teammates directly.

---

## Running SQL Files

All SQL files live in `database/`. Run them in Workbench in this exact order:

| Order | File | What it does |
|-------|------|-------------|
| 1st | `schema.sql` | Creates all 11 tables with constraints |
| 2nd | `seed.sql` | Inserts all test data |
| 3rd | `queries.sql` | Runs all SELECT queries, creates views |
| 4th | `plsql.sql` | Creates triggers, procedure, function, cursor |

If you need to reset the database completely:

```sql
DROP DATABASE defense_logistics_db;
CREATE DATABASE defense_logistics_db;
USE defense_logistics_db;
-- Then re-run all 4 files in order
```

---

## Submitted to

Dr. Banisha Sharma
Thapar Institute of Engineering & Technology

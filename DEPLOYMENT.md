# EyeKart — Production Deployment & Operations Guide

This guide documents the production deployment architecture, hosting setup, environment variable configuration, automated database migration, backup procedures, and security controls for the EyeKart Eyewear E-Commerce Platform.

---

## 🏗️ 1. Architecture Overview

```
 ┌──────────────────────┐           HTTPS / REST          ┌──────────────────────┐
 │   Frontend Client    │ ──────────────────────────────> │    Node.js Backend   │
 │   (React 19 + Vite)  │ <────────────────────────────── │     (Express 5)      │
 │  Vercel / Netlify /  │           JSON / JWT            │  Render / Railway /  │
 │   Cloudflare Pages   │                                 │     AWS EC2 / VPS    │
 └──────────────────────┘                                 └──────────┬───────────┘
                                                                     │ Connection Pool
                                                                     ▼
                                                          ┌──────────────────────┐
                                                          │     MySQL Database   │
                                                          │   (AWS RDS / Aiven / │
                                                          │     DigitalOcean)    │
                                                          └──────────────────────┘
```

- **Frontend**: Single-Page Application (SPA) built with React 19, TypeScript, and Vite. Static assets served over a CDN with HTTP/2 and gzip/brotli compression.
- **Backend**: Node.js runtime running Express 5 with Helmet headers, strict CORS origin checks, IP rate limiters, JWT authorization, and parameterized SQL operations.
- **Database**: Relational MySQL 8.0+ database (`eyekart_db`) with indexed foreign keys and ON DELETE CASCADE/SET NULL constraints.

---

## 🌐 2. Recommended Hosting Targets

| Component | Recommended Platform | Alternative | Cost Tier |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Netlify / Cloudflare Pages | Free / Low |
| **Backend** | [Render](https://render.com) | Railway / DigitalOcean App Platform / AWS Elastic Beanstalk | Starter / Pro |
| **Database** | [Aiven for MySQL](https://aiven.io) | AWS RDS MySQL / DigitalOcean Managed MySQL | Dedicated / Free tier available |
| **Document Storage** | Local uploads with Persistent Volume | AWS S3 / Cloudflare R2 | Variable |

---

## 🔐 3. Environment Configuration

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Production Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP port for Node.js | `5000` or process assigned |
| `DB_HOST` | MySQL database host address | `db.production.company.com` |
| `DB_PORT` | MySQL database port | `3306` |
| `DB_USER` | MySQL database user | `eyekart_prod_user` |
| `DB_PASSWORD` | Strong password (min 16 chars) | `K9#m$P2!wZ8vQ1@x` |
| `DB_NAME` | Database schema name | `eyekart_db` |
| `DB_SSL` | Enable TLS/SSL for managed MySQL (Aiven, RDS) | `true` |
| `DB_SSL_CA` | Optional CA bundle file path or PEM content | `/etc/ssl/certs/aiven-ca.pem` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated for multi-domain) | `https://eyekart.com,https://www.eyekart.com` |
| `JWT_SECRET` | High-entropy secret string for JWT signing (256-bit) | Cryptographically generated 64-char string |
| `PRESCRIPTION_UPLOAD_DIR` | Custom persistent disk mount path for prescription files | `/var/data/prescriptions` (optional) |
| `RAZORPAY_KEY_ID` | Razorpay Merchant Key ID | `rzp_live_xxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Merchant Secret Key | `xxxxxxxxxxxxxxxxxxxxxxxx` |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Production Example |
|---|---|---|
| `VITE_API_BASE_URL` | Full URL of the deployed backend API | `https://api.eyekart.com` |

---

## 🚀 4. Step-by-Step Deployment Instructions

### Step 4.1: Database Provisioning

1. Create a MySQL 8.0 instance on your managed database provider (e.g., Aiven, DigitalOcean, or AWS RDS).
2. Connect to the database using MySQL CLI or GUI client:
   ```bash
   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p
   ```
3. Create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS eyekart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE eyekart_db;
   ```
4. Run the production schema migration:
   **Option A: Automated Node runner (Recommended):**
   ```bash
   cd backend
   npm run migrate
   ```
   *or directly via CLI:*
   ```bash
   mysql -h <DB_HOST> -u <DB_USER> -p eyekart_db < backend/schema_production.sql
   ```

### Step 4.2: Backend Deployment (e.g., Render / VPS)

1. Connect your repository to the hosting provider.
2. Set Root Directory to `backend/`.
3. Set Build Command:
   ```bash
   npm install --omit=dev
   ```
4. Set Start Command:
   ```bash
   node server.js
   ```
5. Add all Backend Environment Variables listed in Section 3 above.
6. If using local persistent uploads for prescriptions, mount a persistent disk to `backend/uploads/prescriptions`.
7. Initialize the initial admin user using `make_admin.js` or via secure SQL insert:
   ```bash
   node make_admin.js
   ```

### Step 4.3: Frontend Deployment (e.g., Vercel / Netlify)

1. Connect your repository to Vercel/Netlify.
2. Set Root Directory to `frontend/`.
3. Framework Preset: **Vite**.
4. Build Command:
   ```bash
   npm run build
   ```
5. Output Directory:
   ```bash
   dist
   ```
6. Add Environment Variable:
   ```env
   VITE_API_BASE_URL=https://<your-backend-domain>
   ```
7. Configure Single Page Application rewrite in hosting dashboard or `vercel.json`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 🗄️ 5. Database Backup & Migration Procedures

### Automated Daily Backups (`mysqldump`)

Set up a daily cron job on your server or automated pipeline:

```bash
#!/bin/bash
# Backup script: backup_eyekart_db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/eyekart"
BACKUP_FILE="${BACKUP_DIR}/eyekart_db_${DATE}.sql.gz"

mkdir -p "${BACKUP_DIR}"

mysqldump --single-transaction --quick --routines --triggers \
  -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" eyekart_db | gzip -9 > "${BACKUP_FILE}"

# Retain backups for 30 days
find "${BACKUP_DIR}" -type f -name "eyekart_db_*.sql.gz" -mtime +30 -delete
echo "Backup saved to: ${BACKUP_FILE}"
```

### Database Restoration Procedure

To restore the database from a compressed backup file:

```bash
# 1. Decompress and verify backup integrity
gunzip -c /var/backups/eyekart/eyekart_db_20261009_120000.sql.gz > restore.sql

# 2. Test restore on a staging database first
mysql -h <STAGING_HOST> -u <DB_USER> -p eyekart_staging < restore.sql

# 3. Production restoration (only after stopping application traffic)
mysql -h <DB_HOST> -u <DB_USER> -p eyekart_db < restore.sql
```

---

## 🛡️ 6. Production Security Checklist

- [x] **Zero Plaintext Credentials in VCS**: `.gitignore` configured to exclude `.env`, `.env.*` (while keeping `.env.example`).
- [x] **100% Parameterized SQL Queries**: All user input executed through `mysql2/promise` placeholders `?` to prevent SQL injection.
- [x] **Cross-Origin Resource Sharing (CORS)**: Strict whitelist verification supporting single or comma-separated origins with credentials.
- [x] **Rate Limiting**: Multi-tiered rate limiters applied to general traffic (600 req/15min), auth endpoints (60 req/15min), and order creation (40 req/15min).
- [x] **Security Headers**: `helmet` enabled to enforce CSP, frameguard, X-Content-Type-Options, and referrer policy.
- [x] **Secure Prescription Access**: Uploaded prescription documents require authenticated JWT ownership or admin privilege. Direct unauthorized path traversal blocked with `path.basename`.
- [x] **Cryptographic Secret Entropy**: `JWT_SECRET` generated using cryptographically secure random bytes.
- [x] **Transactional Atomicity**: Order creation and stock adjustments wrapped in ACID database transactions with row-level locking (`FOR UPDATE`).

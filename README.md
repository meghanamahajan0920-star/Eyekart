# EyeKart — Eyewear E-Commerce Platform

A production-grade, full-stack e-commerce web application engineered for browsing, customizing, trying on, and purchasing optical frames, sunglasses, and computer glasses.

---

## 🚀 Tech Stack

### Frontend
- **Framework & Language**: React 19, TypeScript
- **Bundler & Tooling**: Vite 6
- **Routing**: React Router 7
- **Styling**: Vanilla Modern CSS (Responsive Design, CSS Variables, Glassmorphism)
- **State Management**: React Context (`AuthContext`, `CartContext`, `WishlistContext`, `ToastContext`)

### Backend
- **Runtime & Framework**: Node.js, Express 5
- **Database**: MySQL with `mysql2/promise` connection pool
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing
- **Payments**: Razorpay Node SDK (Order creation & HMAC-SHA256 signature verification) + Cash on Delivery (COD)

### Security Hardening
- **HTTP Security Headers**: `helmet`
- **Cross-Origin Resource Sharing**: Strict origin verification via `cors`
- **Rate Limiting**: Multi-tiered rate limiters (`express-rate-limit`) for API, Auth, and Order routes
- **Database Safety**: 100% Parameterized SQL queries to prevent SQL injection
- **Data Protection**: Zero secrets or credentials leaked in responses; passwords excluded from API queries

---

## 🌟 Features

### Customer Experience
- **User Authentication**: Secure signup, login, persistent session with JWT, and clean logout.
- **Eyewear Catalog**: Comprehensive list of eyeglasses, sunglasses, blue-light blockers, and reading glasses.
- **Search & Advanced Filters**: Multi-faceted filtering by category, brand, gender, frame type (Full Rim, Half Rim, Rimless), frame material (Acetate, Metal, Titanium, TR90), lens type, price range slider, and discount percentage.
- **Sorting**: Sort by Featured, Price (Low to High / High to Low), Discount, and Newest arrivals.
- **Product Details**: Complete optical specifications, dimensions, materials, warranties, and stock indicators.
- **Wishlist Management**: Real-time heart toggles, persistent server-backed user wishlists, out-of-stock badges, and one-click move-to-cart.
- **Customer Reviews & Ratings**: 5-star rating breakdown, verified buyer validation (only users who purchased the frame can review), review editing, and owner deletion.
- **Prescription Optical Support**: Option to enter manual sphere (SPH), cylinder (CYL), axis, and pupillary distance (PD), or upload optical prescription documents (PDF, JPG, PNG up to 5MB) securely.
- **Virtual Try-On (Foundation Preview)**: In-browser live camera stream overlay with adjustable scale, vertical, and horizontal alignment guides. Operates 100% locally on the user's device with complete privacy.
- **Shopping Cart**: Real-time quantity adjustment, persistent storage, and automatic subtotal calculation.
- **Checkout & Payment**: Address details, Cash on Delivery (COD) processing, and Razorpay online payment integration.
- **Order Tracking & Details**: Complete invoice summary, attached prescription review, live status timeline, and self-service order cancellation with automatic inventory restock.

### Admin Experience
- **Admin Dashboard**: Real-time revenue metrics, order status counts, and low-stock alerts.
- **Product Catalog Management**: Create new frames, edit pricing/specs/images, and perform live stock adjustments.
- **Order Fulfillment**: Review customer orders, inspect attached prescriptions, and advance order status (Pending → Processing → Shipped → Delivered / Cancelled).
- **Review Moderation**: Full administrative review oversight and deletion capability.

---

## 🗄️ Database Schema

The system uses a relational MySQL database (`eyekart_db`) with cascading foreign keys and optimized indexes:

1. **`users`**: Customer and administrator profiles (`id`, `name`, `email`, `mobile`, `password`, `role`).
2. **`categories`**: Eyewear categories (Eyeglasses, Sunglasses, Blue Light, etc.).
3. **`brands`**: Eyewear manufacturers and designer brands.
4. **`products`**: Frame catalog, optical specs, pricing, stock levels, and illustrations/images.
5. **`orders`**: Customer orders, delivery addresses, payment methods, transaction references, and statuses.
6. **`order_items`**: Line items per order with snapshot price at time of purchase.
7. **`order_prescriptions`**: Optical prescriptions linked to specific orders and authenticated users.
8. **`wishlist`**: Saved products per user with unique constraints and foreign keys.
9. **`reviews`**: Verified customer ratings, feedback, and moderation timestamps.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server (v8.0 or higher)

### 1. Database Setup
Log in to MySQL and initialize the database schema:
```sql
CREATE DATABASE eyekart_db;
USE eyekart_db;
```
Run the migration script:
```bash
cd backend
npm run migrate
```
*(or manually via MySQL CLI: `mysql -u root -p eyekart_db < backend/schema_production.sql`)*

### 2. Backend Configuration
Navigate to the `backend/` folder:
```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=eyekart_db
DB_PORT=3306
PORT=5000
FRONTEND_URL=http://localhost:5174
JWT_SECRET=your_secure_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Frontend Configuration
Navigate to the `frontend/` folder:
```bash
cd ../frontend
npm install
```

Create a `.env` file based on `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 🏃 Running the Application

### Start the Backend
From the `backend/` directory:
```bash
npm start
```
*Backend runs on `http://localhost:5000`.*

### Start the Frontend
From the `frontend/` directory:
```bash
npm run dev
```
*Frontend runs on `http://localhost:5174` (or `http://localhost:5173`).*

---

## 🧪 Testing & Verification

### Backend Regression & Security Tests
Run the automated test suites from the `backend/` folder:
```bash
# Complete Phase 4 regression test (30/30 API & Security tests)
node test_phase4_backend.js

# Phase 6 test suite (20/20 Wishlist, Reviews, Prescription, VTO foundation tests)
node test_phase6_backend.js

# Phase 7 Security negative test suite (15/15 Negative Auth, Permissions & Input Validation tests)
node test_phase7_security.js
```

### Frontend Production Build
Validate TypeScript compilation and Vite bundling from the `frontend/` folder:
```bash
npm run build
```

---

## 🛡️ Security & Privacy Notice
- **Virtual Try-On**: The camera feed operates entirely in-browser via the WebRTC `getUserMedia` API. Video frames are rendered into a local `<video>` element with an optical frame overlay and are never transmitted or stored on any server.
- **Prescription Uploads**: Files are stored with cryptographically generated filenames in an authorized directory and are only accessible by the customer who uploaded them and store administrators.
- **Payment Security**: Razorpay keys and secrets are handled strictly server-side; order amounts are computed directly from database product records to prevent client-side manipulation.

---

## 💎 Phase 8 Enhancements & Quality Hardening
- **Universal Export Harmonization**: Dual named and default exports implemented across all 13 pages, 7 components, contexts, and services to eliminate "Module has no default export" warnings across any bundler/import convention.
- **LocalStorage Hardening**: Added try-catch fault tolerance around JSON parsing in `AuthContext` and `CartContext` to safeguard against malformed browser storage state.
- **Admin Prescription Inspection**: Enhanced `AdminOrders` modal to fully inspect attached optical powers (SPH, CYL, AXIS, Pupillary Distance, Notes) when fulfilling eyewear orders.
- **Secure Document Access**: Added `downloadPrescriptionFile` streaming with authorized JWT verification to view and download attached prescriptions in `OrderDetails` and `AdminOrders`.
- **Responsive Architecture (Desktop, Tablet & Mobile)**: Fluid styling additions for viewports ≤ 900px, ≤ 640px, and ≤ 400px ensuring catalog grids, stepper timelines, VTO overlays, checkout forms, and tables adapt cleanly to all devices.

---

## 🚀 Phase 9 — Final Integration, End-to-End Testing & Deployment Preparation

### Automated Verification Suites (Executed & Verified)
All integration, regression, and security suites execute with 100% pass rates:
```bash
cd backend

# Phase 9 Comprehensive End-to-End Integration Test Suite (47/47 tests passed)
node test_phase9_e2e_integration.js

# Phase 7 Negative Security Suite (15/15 tests passed)
node test_phase7_security.js

# Phase 6 Core Features Suite (20/20 tests passed)
node test_phase6_backend.js

# Phase 4 Regression Suite (30/30 tests passed)
node test_phase4_backend.js
```

### Frontend Production Bundling
TypeScript verification and production chunk minimization pass with zero errors:
```bash
cd frontend
npm run build
# Output: dist/index.html (1.52 kB), dist/assets/index-*.css (34.15 kB), dist/assets/index-*.js (433.19 kB)
```

### Production Readiness & Operations
- **Full Deployment Guide**: Refer to [`DEPLOYMENT.md`](file:///c:/Users/HP/OneDrive/Desktop/eyewear%20field%20project/DEPLOYMENT.md) for detailed deployment steps on Vercel/Netlify (Frontend) and Render/AWS (Backend), managed MySQL database provisioning, daily backup automation, and migration procedures.
- **Multi-Origin Production CORS**: Support for single or comma-separated origins in `FRONTEND_URL` for flexible domain and staging deployment.
- **Strict Viewport Fluidity**: CSS responsive enhancements targeting 320px, 375px, 480px, 640px, 768px, 1024px, and desktop widths with zero horizontal overflow.



# ⚙️ MANIVAASAM Backend API

This is the Node.js / Express / MongoDB backend REST API for **MANIVAASAM (మణినివాసం / मणिनिवासम्)**.

> For complete documentation, system architecture, and full-stack setup instructions, please see the [Root README](../README.md).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in this directory:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/apartment-maintenance
JWT_SECRET=manivaasam_super_secret_jwt_key_2026
JWT_EXPIRE=30d
```

### 3. Run Development Server
```bash
npm run dev
```

The API will start at `http://localhost:5001/api`.

---

## 📡 Key API Routes

- `/api/auth`: Admin login, registration, resident login, and resident registration.
- `/api/flats`: Society flat directory and live balance tracking.
- `/api/bills`: Monthly maintenance and water bills generation.
- `/api/resident`: Resident-specific endpoints (personal flat, bills, payment submissions).
- `/api/payments`: Payment recording, pending verification queue, and approval/rejection.
- `/api/expenses`: Society expense tracking and invoice attachments.
- `/api/complaints`: Resident tickets, committee comments, and resolution workflow.
- `/api/reports`: Financial summaries, occupancy, and collection analytics.

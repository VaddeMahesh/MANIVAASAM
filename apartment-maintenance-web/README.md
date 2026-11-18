# 🌐 MANIVAASAM Web Frontend

This is the Next.js frontend application for **MANIVAASAM (మణినివాసం / मणिनिवासम्)** — a smart apartment maintenance and utility management platform.

> For complete documentation, system architecture, API endpoints, and full-stack setup instructions, please see the [Root README](../README.md).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in this directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or [http://localhost:3001](http://localhost:3001) if port 3000 is occupied).

---

## 📁 Key Directories

- `app/(auth)/`: Login (Admin & Resident tabs) and Registration.
- `app/(dashboard)/`: Admin portal views (Dashboard, Flats, Billing, Collections with Payment Verifications, Expenses, Complaints, Reports).
- `app/resident/`: Dedicated resident portal for personal dues, UPI payments, screenshot upload, and PDF receipts.
- `components/`: Modular Radix UI components, status badges, chart visualizations, and modals.
- `lib/excelParser.ts`: Excel sub-meter parser with 10x multiplier & Manjeera/tanker slab logic.
- `store/index.ts`: Central Zustand application store with localStorage persistence.

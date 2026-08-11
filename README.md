# ERP / CRM System

A full-stack ERP/CRM system for wholesale/distribution companies.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js, TypeScript, Express.js   |
| Database   | PostgreSQL                        |
| Frontend   | React, JavaScript, CSS            |
| DevOps     | Docker, Docker Compose, AWS EC2   |

---

## Features

- **Auth** — JWT login, role-based access (admin, sales, warehouse, accounts)
- **Customers** — Full CRUD, search, credit limit
- **Products** — Inventory with low-stock alerts
- **Purchase Orders** — Create PO, receive stock (auto updates inventory)
- **Delivery Challans** — Create challan, deducts stock, dispatch flow
- **Invoices** — Tax calculation (GST), payment tracking, overdue alerts
- **CRM Follow-ups** — Schedule calls/meetings, today's task view, mark done
- **Dashboard** — Live summary of all key metrics

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd erp-crm

# Backend
cd backend
npm install
cp .env.example .env    # fill in your DB credentials and JWT secret

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Database Setup

Create the database in PostgreSQL:
```sql
CREATE DATABASE erp_crm;
```

Run migrations:
```bash
cd backend
npm run db:migrate
```

### 3. Create First Admin User

Use the register API (or a REST client like Postman):
```
POST http://localhost:5000/api/auth/register
{
  "name": "Admin User",
  "email": "admin@company.com",
  "password": "admin123",
  "role": "admin"
}
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

## Docker Setup (Recommended)

```bash
cd erp-crm
cp backend/.env.example backend/.env   # set DB_PASSWORD and JWT_SECRET

docker-compose up --build
```

Then run migrations inside the container:
```bash
docker-compose exec backend npm run db:migrate
```

App runs at: http://localhost

---

## AWS Deployment (EC2)

### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t3.small (minimum)
- Security Group: open ports 22, 80, 443, 5000

### 2. Install Docker on EC2

```bash
sudo apt update && sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
```

### 3. Deploy

```bash
git clone <repo-url>
cd erp-crm
cp backend/.env.example backend/.env
# Edit .env with production values

docker-compose up -d --build
docker-compose exec backend npm run db:migrate
```

### 4. Environment Variables (Production)

| Variable       | Description                        |
|----------------|------------------------------------|
| DB_HOST        | postgres / RDS endpoint            |
| DB_PORT        | 5432                               |
| DB_NAME        | erp_crm                            |
| DB_USER        | postgres                           |
| DB_PASSWORD    | strong password                    |
| JWT_SECRET     | long random string                 |
| JWT_EXPIRES_IN | 7d                                 |
| PORT           | 5000                               |

### Optional: Use AWS RDS
Replace `db` service in docker-compose with your RDS endpoint in `.env`.

---

## API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | /api/auth/register                | Register user            |
| POST   | /api/auth/login                   | Login                    |
| GET    | /api/dashboard                    | Dashboard stats          |
| GET    | /api/customers                    | List customers           |
| POST   | /api/customers                    | Create customer          |
| GET    | /api/products                     | List products            |
| GET    | /api/products/low-stock           | Low stock products       |
| GET    | /api/purchase-orders              | List POs                 |
| POST   | /api/purchase-orders              | Create PO                |
| PATCH  | /api/purchase-orders/:id/receive  | Receive PO + update stock|
| GET    | /api/challans                     | List challans            |
| POST   | /api/challans                     | Create challan           |
| PATCH  | /api/challans/:id/status          | Update challan status    |
| GET    | /api/invoices                     | List invoices            |
| POST   | /api/invoices                     | Create invoice           |
| PATCH  | /api/invoices/:id/payment         | Record payment           |
| GET    | /api/invoices/overdue             | Overdue invoices         |
| GET    | /api/crm                          | List follow-ups          |
| POST   | /api/crm                          | Create follow-up         |
| PATCH  | /api/crm/:id/status               | Update follow-up status  |

---

## Project Structure

```
erp-crm/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection, migrations
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation, error handler
│   │   └── routes/         # Express routes
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios + service functions
│   │   ├── components/     # Sidebar, Layout, Modal
│   │   ├── context/        # Auth context
│   │   └── pages/          # All page components
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

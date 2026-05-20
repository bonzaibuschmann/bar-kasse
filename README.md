# Bar Kasse 💰

Cash Register Web App for Bars — built for tablets, iPads, and touch devices.

## URLs

- **Dev (live reload):** `http://157.254.223.246:3001`
- **Production:** `http://157.254.223.246:3000`

## Quick Start

```bash
# Clone the repo
git clone https://github.com/bonzaibuschmann/bar-kasse.git
cd bar-kasse

# Start everything
docker compose up -d

# First time: seed the database
docker compose exec backend-dev npx prisma migrate dev --name init
docker compose exec backend-dev npx prisma db seed
```

## Pages

| Page | URL | Auth |
|------|-----|------|
| Kasse (Register) | `/` | No |
| Admin Config | `/config` | Yes (admin) |
| Dashboard | `/dashboard` | Yes (admin) |
| Login | `/login` | — |

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

## Architecture

- **Frontend:** React + Vite + TailwindCSS (touch-optimized)
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL 16
- **All services** run via Docker Compose

## Moving to Laptop

1. Stop all containers: `docker compose down`
2. Copy the project folder (or `git clone`)
3. `docker compose up -d`
4. The app will be available at `http://localhost:3000` (prod) and `http://localhost:3001` (dev)

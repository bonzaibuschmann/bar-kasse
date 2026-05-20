# Bar Kasse 💰

Cash Register Web App for Bars — built for tablets, iPads, and touch devices.

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

## Ports

| Service | Port |
|---------|------|
| Production Frontend | `3000` |
| Dev Frontend (hot reload) | `3001` |
| Production Backend | `4000` |
| Dev Backend | `4001` |
| PostgreSQL | `5432` |

## Pages

| Page | URL | Auth |
|------|-----|------|
| Kasse (Register) | `/` | No |
| Admin Config | `/config` | Yes (admin) |
| Dashboard | `/dashboard` | Yes (admin) |
| Login | `/login` | — |



## Architecture

- **Frontend:** React + Vite + TailwindCSS (touch-optimized)
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL 16
- **All services** run via Docker Compose

## Moving to Laptop

1. Stop all containers: `docker compose down`
2. Copy the project folder (or `git clone`)
3. `docker compose up -d`
4. The app will be available on your machine's IP at port 3000 (prod) and 3001 (dev)

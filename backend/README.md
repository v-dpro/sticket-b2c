## Sticket API (backend)

### Setup

- Install deps:

```bash
npm install
```

- Copy env:

```bash
cp .env.example .env
```

- Configure `DATABASE_URL` to a Postgres instance.

### Prisma

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Run

```bash
npm run dev
```

Health check: `http://localhost:3000/health`




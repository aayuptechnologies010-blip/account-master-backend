# Account Master — Backend API

Node.js + Express + SQLite backend for the Account Master Flutter app.

---

## Stack

| Layer      | Tech                  |
|------------|-----------------------|
| Runtime    | Node.js ≥ 18          |
| Framework  | Express 4             |
| Database   | SQLite via better-sqlite3 |
| Auth       | JWT (jsonwebtoken)    |
| OTP        | In-memory (dev) / SMS gateway (prod) |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure env
cp .env.example .env
# Edit .env — at minimum change JWT_SECRET

# 3. Start dev server (auto-restarts)
npm run dev

# 4. Start production server
npm start
```

The server starts on **http://localhost:3000** by default.

---

## Environment Variables

| Variable            | Default                  | Description                            |
|---------------------|--------------------------|----------------------------------------|
| `PORT`              | `3000`                   | HTTP port                              |
| `NODE_ENV`          | `development`            | Set to `production` to hide OTP in response |
| `JWT_SECRET`        | —                        | **Required.** Long random string       |
| `JWT_EXPIRES_IN`    | `7d`                     | JWT lifetime                           |
| `OTP_EXPIRY_MINUTES`| `10`                     | OTP validity window                    |
| `DB_PATH`           | `./db/account_master.db` | SQLite file path                       |

---

## API Reference

Full endpoint list, request/response shapes, and SMS-provider integration details are kept in internal docs (Postman collection), not in this public-facing README, to avoid publishing the API surface.

---

## Project Structure

```
account-master-backend/
├── server.js           # Entry point, Express app
├── .env.example        # Environment template
├── package.json
├── db/
│   └── database.js     # SQLite init + schema
├── middleware/
│   └── auth.js         # JWT verify middleware
└── routes/
    ├── auth.js         # /auth/*
    ├── business.js     # /business/*
    ├── clients.js      # /clients/*
    └── items.js        # /items/*
```

---

## Flutter Integration

In your Flutter app, set the base URL:
```dart
const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator
// const String baseUrl = 'http://localhost:3000'; // iOS simulator / web
// const String baseUrl = 'https://your-domain.com'; // production
```

Store the JWT token from `/auth/verify-otp` in `flutter_secure_storage` and attach it to every request:
```dart
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
}
```

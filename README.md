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

### 🔐 Auth — `/auth`

#### Send OTP
```
POST /auth/send-otp
Content-Type: application/json

{ "phone": "9876543210" }
```
Response:
```json
{ "success": true, "message": "OTP sent successfully", "otp": "123456" }
```
> `otp` is only included in non-production mode. In production, it is sent via SMS.

#### Verify OTP
```
POST /auth/verify-otp
Content-Type: application/json

{ "phone": "9876543210", "otp": "123456" }
```
Response:
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": 1, "phone": "9876543210" }
}
```

#### Logout
```
POST /auth/logout
Authorization: Bearer <token>
```
Response:
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### 🏢 Business — `/business`
All routes require `Authorization: Bearer <token>`.

#### Get Profile
```
GET /business/profile
```

#### Update Profile
```
PUT /business/profile
Content-Type: application/json

{
  "business_name": "Ramesh Enterprises",
  "gstin": "07AAACV1234F1Z5",
  "pan": "AAACV1234F",
  "address1": "Shop 5, Main Market",
  "city": "Delhi",
  "state": "Delhi",
  "pin_code": "110005",
  "email": "ramesh@example.com",
  "website": "https://ramesh.in"
}
```
Response: `{ "success": true }`

---

### 👥 Clients — `/clients`
All routes require `Authorization: Bearer <token>`.

#### Get All Clients
```
GET /clients
```

#### Add Client
```
POST /clients
Content-Type: application/json

{
  "partyName": "Ramesh Stores",
  "contactNo": "9876543210",
  "areaName": "Karol Bagh",
  "address1": "Shop 5",
  "address2": "Main Market",
  "pinCode": "110005",
  "gstinNo": "07AAACV1234F1Z5"
}
```
> `partyCode` is **auto-generated** on the server (e.g. `RAM001`).

Response:
```json
{ "success": true, "client": { "id": 2, "partyCode": "RAM001", ... } }
```

#### Update Client
```
PUT /clients/:id
Content-Type: application/json
{ ...same fields as add... }
```
Response: `{ "success": true }`

#### Delete Client
```
DELETE /clients/:id
```
Response: `{ "success": true }`

---

### 📦 Items / Stock — `/items`
All routes require `Authorization: Bearer <token>`.

#### Get All Items
```
GET /items
```

#### Get Low-Stock Items
```
GET /items/low-stock?threshold=10
```

#### Add Item
```
POST /items
Content-Type: application/json

{
  "itemName": "Basmati Rice 5kg",
  "description": "Premium quality",
  "unitPrice": 450.00,
  "unit": "bag",
  "hsnCode": "1006",
  "defaultTaxSlab": "GST 5%",
  "stockQty": 120
}
```
> `itemCode` is **auto-generated** (e.g. `ITM001`).

#### Update Item
```
PUT /items/:id
Content-Type: application/json
{ ...same fields as add... }
```

#### Delete Item
```
DELETE /items/:id
```

---

## SMS Integration (Production)

Open `routes/auth.js` and replace the `sendOtpViaSms` function with your provider:

**MSG91 example:**
```js
async function sendOtpViaSms(phone, otp) {
  await fetch('https://api.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: process.env.MSG91_KEY },
    body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE, mobile: phone, otp }),
  });
}
```

**Twilio example:**
```js
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
async function sendOtpViaSms(phone, otp) {
  await twilio.messages.create({
    body: `Your Account Master OTP is ${otp}. Valid for 10 minutes.`,
    from: process.env.TWILIO_FROM,
    to: `+91${phone}`,
  });
}
```

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

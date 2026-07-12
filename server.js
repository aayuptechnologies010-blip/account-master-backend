if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiters');
const connectDB = require('./db/database');

dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
});

connectDB();

const app = express();

app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : [];

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://10.28.25.151:5173', 'https://account-master-panel.onrender.com');
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(apiLimiter);

app.use(express.json());

app.use('/auth',      require('./routes/auth'));
app.use('/admin',     require('./routes/admin'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/business', require('./routes/business'));
app.use('/clients', require('./routes/clients'));
app.use('/items', require('./routes/items'));
app.use('/invoices', require('./routes/invoices'));
app.use('/outward-bills', require('./routes/outwardBills'));
app.use('/salesmen', require('./routes/salesmen'));
app.use('/payments', require('./routes/payments'));
app.use('/import', require('./routes/import'));

app.get('/', (req, res) => {
  res.send('Account Master API Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Dev only: fix SSL certificate issue on restricted networks
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./db/database');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/business', require('./routes/business'));
app.use('/clients', require('./routes/clients'));
app.use('/items', require('./routes/items'));
app.use('/invoices', require('./routes/invoices'));

app.get('/', (req, res) => {
  res.send('Account Master API Running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
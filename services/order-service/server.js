const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db')

const orderRoutes = require('./src/routes/orderRoutes.js');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors());

connectDB();

app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});


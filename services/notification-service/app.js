require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const notificationRoutes = require('./routes/notificationRoutes');



const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));


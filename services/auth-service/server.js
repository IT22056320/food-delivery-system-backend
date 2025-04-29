require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

require('./src/config/passport');

const app = express();

// ✅ CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // frontend origin
  credentials: true,              // allow sending cookies
}));

// ✅ Express session setup (for passport if used)
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ JSON and cookie parsing
app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ✅ Global error handler (should be last)
app.use(errorHandler);

// ✅ Connect DB and start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});

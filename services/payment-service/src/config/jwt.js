// JWT configuration for payment service
const jwtSecret = process.env.JWT_SECRET || "payment-service-jwt-secret";

module.exports = {
  jwtSecret,
};

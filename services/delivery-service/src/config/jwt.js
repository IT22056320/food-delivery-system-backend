// JWT configuration
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret"

module.exports = {
    jwtSecret,
}

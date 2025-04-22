const mongoose = require("mongoose")

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })

        console.log(`MongoDB Connected: ${conn.connection.host}`)
        return conn
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`)
        console.error("Full error:", error)
        throw error
    }
}

module.exports = { connectDB }

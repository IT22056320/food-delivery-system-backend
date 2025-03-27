const tokenSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    token: String,
    createdAt: { type: Date, default: Date.now, expires: 3600 }
  });
  
  module.exports = mongoose.model('Token', tokenSchema);
  
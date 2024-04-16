const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  content: String,
  user: String,
  rating: Number,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  createdAt: { type: Date, default: Date.now },
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
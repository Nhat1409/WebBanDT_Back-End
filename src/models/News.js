const mongoose = require('mongoose')
const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
});

// Tạo model từ schema
const News = mongoose.model("News", newsSchema);
module.exports = News;
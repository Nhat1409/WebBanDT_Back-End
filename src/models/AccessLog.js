// models/AccessLog.js
const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  user_id: String,
  session_id: String,
  timestamp: String,
  action: String,
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);
module.exports = AccessLog;
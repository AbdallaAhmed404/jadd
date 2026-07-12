const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // اللي بلغ
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // المتبلغ عنه
  content: { type: String, required: true } // محتوى البلاغ
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
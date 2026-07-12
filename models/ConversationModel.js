const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // ربط مع موديل المستخدمين
    required: true 
  }],
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', // ربط مع موديل المنتجات
    required: true 
  },
  lastMessage: { 
    type: String // لتخزين آخر رسالة وعرضها في قائمة المحادثات
  }
}, { timestamps: true }); // timestamps تضيف createdAt و updatedAt تلقائياً

module.exports = mongoose.model('Conversation', conversationSchema);
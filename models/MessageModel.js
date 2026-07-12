const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', // الرابط الأساسي مع المحادثة
    required: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true 
  },
  isRead: { 
    type: Boolean, 
    default: false // مفيدة جداً لميزة "تمت القراءة"
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
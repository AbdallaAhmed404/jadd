const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', // الرابط الأساسي مع المحادثة
    required: true,
    index: true // لتسريع جلب رسائل محادثة معينة
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
    default: false, // مفيدة جداً لميزة "تمت القراءة"
    index: true // لتسريع فلترة الرسائل المقروءة وغير المقروءة
  }
}, { timestamps: true });

// فهرس مركب (Compound Index) عالي الأهمية:
// يجمع بين المحادثة، حالة القراءة، والمرسل، لتسريع استعلامات عدّ الرسائل غير المقروءة (Unread Count) لكل محادثة بكفاءة عالية جداً.
messageSchema.index({ conversationId: 1, isRead: 1, senderId: 1 });

// فهرس مركب إضافي للرسائل مرتبة حسب التاريخ داخل المحادثة (يساعد كثيراً مع timestamps للـ sorting)
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
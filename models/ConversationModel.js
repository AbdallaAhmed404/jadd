const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // ربط مع موديل المستخدمين
    required: true,
    index: true // لتسريع البحث عن المحادثات التي يشارك فيها مستخدم معين
  }],
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', // ربط مع موديل المنتجات
    required: true,
    index: true // لتسريع البحث عن المحادثات المتعلقة بمنتج معين
  },
  lastMessage: { 
    type: String // لتخزين آخر رسالة وعرضها في قائمة المحادثات
  }
}, { timestamps: true }); // timestamps تضيف createdAt و updatedAt تلقائياً

// فهرس مركب (Compound Index) عالي الأهمية:
// يدمج بين المنتج وأطراف المحادثة، وهو أساسي جداً لتنفيذ دالة الوصول أو البحث عن محادثة سابقة (مثل accessChat) لنفس المنتج بين نفس المستخدمين بدقة وسرعة فائقة.
conversationSchema.index({ productId: 1, participants: 1 });

// فهرس إضافي لترتيب المحادثات حسب وقت آخر تحديث (UpdatedAt) تنازلياً، وهو مفيد جداً لعرض قائمة المحادثات للأعلى بحسب الأحدث.
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
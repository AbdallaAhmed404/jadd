const mongoose = require("mongoose"); // <-- أضف هذا السطر في البداية

const notificationSchema = new mongoose.Schema({
  // المستخدم المستهدف (المتلقي للإشعار)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // لتحسين سرعة البحث حسب المستخدم
  },
  
  // عنوان الإشعار يدعم اللغتين
  title: {
    ar: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true }
  },
  
  // نص الإشعار التفصيلي يدعم اللغتين
  message: {
    ar: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true }
  },
  
  // نوع الإشعار لتحديد الشكل أو إعادة التوجيه
  type: {
    type: String,
    enum: [ "offer_received", "offer_accepted", "offer_rejected", "review"],
    required: true
  },

  
  // معرف العنصر المرتبط
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  
  // هل تم قراءة الإشعار أم لا
  isRead: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true // لإنشاء حقلين تلقائياً: createdAt و updatedAt
});

module.exports = mongoose.model("Notification", notificationSchema);
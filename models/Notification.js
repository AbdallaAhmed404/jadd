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
    required: true,
    index: true // لتسريع تصفية الإشعارات حسب النوع إن أردت ذلك مستقبلاً
  },

  // معرف العنصر المرتبط
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  
  // هل تم قراءة الإشعار أم لا
  isRead: {
    type: Boolean,
    default: false,
    index: true // لتسريع فلترة الإشعارات المقروءة وغير المقروءة
  }

}, {
  timestamps: true // لإنشاء حقلين تلقائياً: createdAt و updatedAt
});

// فهارس مركبة (Compound Indexes) عالية الأهمية:
// 1. فهرس يجمع بين المستخدم وحالة القراءة ووقت الإنشاء: لتسريع جلب أحدث الإشعارات للمستخدم مع إمكانية فرزها أو فلترتها بكفاءة فائقة (مثل جلب الإشعارات غير المقروءة وترتيبها تنازلياً).
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// 2. فهرس لترتيب إشعارات المستخدم العامّة تنازلياً حسب وقت الإنشاء (الأحدث أولاً).
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
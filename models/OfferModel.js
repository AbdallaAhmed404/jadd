const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true,
        index: true // لتسريع البحث عن العروض المرتبطة بمنتج معين
    },
    buyerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // لتسريع جلب العروض التي قدمها المشتري
    },
    sellerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // لتسريع جلب العروض الواردة للبائع
    },
    offerPrice: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending',
        index: true // لتسريع فلترة العروض حسب حالتها (معلقة، مقبولة، مرفوضة)
    }
}, { timestamps: true });

// فهارس مركبة (Compound Indexes) متقدمة:
// 1. لتسريع استعلامات البائع عند عرض العروض الواردة له مرتبطة بحالة العرض أو التاريخ
offerSchema.index({ sellerId: 1, status: 1 });

// 2. لتسريع البحث عن عرض مقدم من مشتري معين لمنتج معين (مثل التحقق من وجود عرض سابق)
offerSchema.index({ productId: 1, buyerId: 1 });

module.exports = mongoose.model('Offer', offerSchema);
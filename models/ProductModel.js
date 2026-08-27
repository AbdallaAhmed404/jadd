const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // إضافة index هنا لتسريع البحث عن منتجات بائع معين
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: "" }, 
    description: { type: String, default: "" }, 
    price: { type: Number, default: 0 }, 
    // إضافة index هنا لتسريع استعلامات تصفية المنتجات حسب التصنيف (Category)
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true }, 
    condition: { type: String, default: "New" }, 
    favoritesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['Available', 'Reserved', 'Sold'], 
        default: 'Available' 
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    // إضافة index هنا لتسريع استبعاد المنتجات المخفية في صفحة العرض العامة (AllProducts)
    isHidden: {
        type: Boolean,
        default: false,
        index: true
    },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    images: [{ type: String }], 
    video: { type: String },    
    location: {
        latitude: { type: Number, required: true }, 
        longitude: { type: Number, required: true }  
    }    
}, { timestamps: true });

// 1. الفهرس المركب الموجود مسبقاً (لتسريع فحص البائع والمشتري معاً)
productSchema.index({ userId: 1, buyer: 1 });

// 2. فهارس مركبة إضافية هامة جداً بناءً على الاستعلامات المتكررة في الكنترولر:
// لتسريع استعلامات جلب منتجات تصنيف معين مع استبعاد المخفية
productSchema.index({ category: 1, isHidden: 1 });

// لتسريع استعلامات جلب منتجات بائع معين مع استبعاد المخفية
productSchema.index({ userId: 1, isHidden: 1 });

// 3. فهرس جغرافي (2dsphere) في حال كنت تستخدم ميزة البحث القريب أو الفلترة بالموقع الجغرافي خطوط الطول والعرض
productSchema.index({ "location.latitude": 1, "location.longitude": 1 });

module.exports = mongoose.model('Product', productSchema);
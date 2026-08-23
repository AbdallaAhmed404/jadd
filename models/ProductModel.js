const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: "" }, // أصبح اختيارياً
    description: { type: String, default: "" }, // أصبح اختيارياً
    price: { type: Number, default: 0 }, // أصبح اختيارياً
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // أصبح اختيارياً
    condition: { type: String, default: "New" }, // أصبح اختيارياً مع قيمة افتراضية
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
    isHidden: {
        type: Boolean,
        default: false
    },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    images: [{ type: String }], 
    video: { type: String },    
    location: {
        latitude: { type: Number, required: true }, // إجباري
        longitude: { type: Number, required: true }  // إجباري
    }    
}, { timestamps: true });

productSchema.index({ userId: 1, buyer: 1 });

module.exports = mongoose.model('Product', productSchema);
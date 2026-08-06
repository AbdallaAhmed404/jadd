const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    condition: { type: String, required: true },
    favoritesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ['Available', 'Reserved', 'Sold'], 
        default: 'Available' 
    },
    images: [{ type: String }], // مصفوفة لـ 7 صور
    video: { type: String },    // فيديو واحد
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    }    
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
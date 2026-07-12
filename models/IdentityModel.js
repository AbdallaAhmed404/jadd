const mongoose = require('mongoose');

const identitySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // لضمان أن كل يوزر له طلب هوية واحد فقط
    },
    idImages: { 
        type: [String], // مصفوفة لتخزين روابط الصور
        required: true 
    },
    status: {
        type: String,
        enum: ['unverified', 'verified']
    }
}, { timestamps: true });

module.exports = mongoose.model('Identity', identitySchema);
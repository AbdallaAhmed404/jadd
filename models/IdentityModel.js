const mongoose = require('mongoose');

const identitySchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true 
    },
    nationalId: { 
        type: String,
        required: true,
        trim: true
    },
    idImages: { 
        type: [String], 
        required: true 
    },
    status: {
        type: String,
        enum: ['unverified', 'verified'],
        default: 'unverified'
    },
    rejectionReason: { // <--- أضفنا هذا الحقل هنا لحفظ السبب في قاعدة البيانات
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model('Identity', identitySchema);
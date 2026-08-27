const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        ar: { type: String, required: true, unique: true, trim: true },
        en: { type: String, required: true, unique: true, trim: true }
    },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
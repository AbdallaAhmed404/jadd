const Product= require("../models/ProductModel")
const Admin = require('../models/AdminModel');
const bcrypt = require('bcryptjs');
const customError = require('../customError');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const Identity = require('../models/IdentityModel');
const Category = require('../models/CategoryModel');
const Report = require('../models/ReportModel');

const adminLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // --- التعديل الجديد: التحقق إذا كان الحساب نشطاً ---
        if (admin.isActive === false) {
            return res.status(403).json({ 
                message: 'Your account is deactivated. Please contact the super admin.' 
            });
        }

        // مقارنة كلمة المرور
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // إنشاء التوكن
        const token = jwt.sign(
            { id: admin._id, role: admin.role }, 
            process.env.JWT_SECRET || 'key',
            { expiresIn: '1d' }
        );

        res.status(200).json({ 
            message: 'Admin logged in successfully', 
            token,
            // إرسال بيانات إضافية للفرونت إند (اختياري)
            admin: {
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        console.error("Admin login error:", err);
        // تأكد أن دالة customError مستوردة بشكل صحيح
        return res.status(500).json({ message: "Failed to login admin" });
    }
};


const getAllUsers = async (req, res) => {
    try {
        // نستثني الباسورد من النتائج لحماية البيانات
        const users = await User.find({}).select('-password');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// مسح مستخدم
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ message: "Failed to delete user" });
    }
};

const getAllProducts = async (req, res) => {
    try {
        // جلب المنتجات مع بيانات المستخدم الذي أضافها
        const products = await Product.find({})
            .populate('userId', 'fullName email') 
            .sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch products" });
    }
};

// حذف منتج
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).json({ message: "Failed to delete product" });
    }
};

// IdentityController.js
const getAllIdentities = async (req, res) => {
    try {
        const identities = await Identity.find({})
            .populate('userId', 'fullName email phone verificationStatus'); 
        res.status(200).json({ success: true, data: identities });
    } catch (err) {
        res.status(500).json({ message: "Failed" });
    }
};

// حذف طلب الهوية
const deleteIdentity = async (req, res) => {
    try {
        const { id } = req.params;
        await Identity.findByIdAndDelete(id);
        res.status(200).json({ message: 'Identity request deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete identity request" });
    }
};

const updateUserVerification = async (req, res) => {
    try {
        const { userId } = req.params; // نستقبل الـ userId
        const { status } = req.body; // 'verified' أو 'unverified'

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                verificationStatus: status,
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ success: true, message: "Status updated" });
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    } catch (err) { res.status(500).json({ message: "Failed" }); }
};

const addCategory = async (req, res) => {
    try {
        const newCategory = await Category.create({ name: req.body.name });
        res.status(201).json({ success: true, data: newCategory });
    } catch (err) { res.status(500).json({ message: "Failed to add" }); }
};

const deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) { res.status(500).json({ message: "Failed to delete" }); }
};

const addSubCategory = async (req, res) => {
    try {
        const { categoryId, subCategoryName } = req.body;
        
        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $addToSet: { subCategories: subCategoryName } }, // $addToSet يضيف العنصر إذا لم يكن موجوداً
            { new: true }
        );

        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Sub-category added", category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeSubCategory = async (req, res) => {
    try {
        const { categoryId, subCategoryName } = req.body;

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $pull: { subCategories: subCategoryName } }, // $pull يحذف العنصر من المصفوفة
            { new: true }
        );

        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Sub-category removed", category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'fullName email phone')
      .populate('reportedUser', 'fullName email phone');
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// حذف تقرير
const deleteReport = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
    adminLogin,
    getAllUsers, 
    deleteUser,
    getAllProducts,
    deleteProduct,
    getAllIdentities, 
    deleteIdentity,
    updateUserVerification,
    getAllCategories,
    addCategory,
    deleteCategory,
    getReports, 
    deleteReport,
    addSubCategory,
    removeSubCategory
};
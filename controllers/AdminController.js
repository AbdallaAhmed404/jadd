const Product= require("../models/ProductModel")
const Admin = require('../models/AdminModel');
const bcrypt = require('bcryptjs');
const customError = require('../customError');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const Identity = require('../models/IdentityModel');
const Category = require('../models/CategoryModel');
const Report = require('../models/ReportModel');
const Offer = require('../models/OfferModel');
const Conversation = require('../models/ConversationModel');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // أو الخدمة التي تستخدمها
  auth: {
    user: "jadd.webdev@gmail.com",
    pass: "tmrp qjgc uwxz lees",
  },
});

const updateVendorStatus = async (req, res) => {
    try {
        const userId = req.params.id; // هذا هو الـ userId القادم من الفرونت
        const { status, rejectionReason } = req.body; 

        // 1. تحديث حالة التحقق في جدول الـ User
        const user = await User.findByIdAndUpdate(
            userId, 
            { verificationStatus: status },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 2. تحديث جدول الـ Identity لحفظ سبب الرفض والحالة
        const identityUpdateData = {
            status: status === 'verified' ? 'verified' : 'unverified',
            rejectionReason: status === 'unverified' ? (rejectionReason || "") : "" // لو تم القبول نمسح السبب القديم، لو رفض نحفظ السبب الجديد
        };

        const updatedIdentity = await Identity.findOneAndUpdate(
            { userId: userId },
            identityUpdateData,
            { new: true }
        );

        // 3. إذا كانت الحالة 'unverified' (رفض) وتم كتابة سبب، نقوم بإرسال إيميل
        if (status === 'unverified' && rejectionReason && user.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Vendor Account Verification Rejected',
                text: `Hello ${user.fullName || 'Vendor'},\n\nUnfortunately, your verification request has been rejected.\n\nReason: ${rejectionReason}\n\nPlease update your information and try again.\n\nBest Regards,\nJadd Team`
            };

            await transporter.sendMail(mailOptions);
        }

        res.status(200).json({ 
            success: true, 
            message: "Status updated and identity saved successfully", 
            data: updatedIdentity 
        });

    } catch (err) {
        console.error("Error updating status:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const adminLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        // 1. البحث عن الأدمن بالإيميل فقط
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // 2. التحقق إذا كان الحساب نشطاً
        if (admin.isActive === false) {
            return res.status(403).json({ 
                message: 'Your account is deactivated. Please contact the super admin.' 
            });
        }

        // 3. مقارنة كلمة المرور المدخلة بالباسورد المشفر في قاعدة البيانات
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // 4. إنشاء التوكن (JWT)
        const token = jwt.sign(
            { id: admin._id, role: admin.role }, 
            process.env.JWT_SECRET || 'key',
            { expiresIn: '1d' }
        );

        // 5. إرسال الاستجابة بنجاح
        res.status(200).json({ 
            message: 'Admin logged in successfully', 
            token,
            admin: {
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        console.error("Admin login error:", err);
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
        // جلب المنتجات مع بيانات المستخدم ومع بيانات الكاتيجوري
        const products = await Product.find({})
            .populate('userId', 'fullName email') 
            .populate('category') // <-- أضف هذه السطر
            .sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch products" });
    }
};

// حذف منتج
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id || req.params.productId;
        
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
    
        // 1. حذف أي محادثات مرتبطة بهذا المنتج
        await Conversation.deleteMany({ productId: productId });
    
        // 2. حذف أي عروض (Offers) مرتبطة بهذا المنتج
        await Offer.deleteMany({ productId: productId });
    
        // 3. حذف المنتج نفسه
        await Product.findByIdAndDelete(productId);
    
        res.status(200).json({ message: "Product and its related conversations and offers deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting product", error: error.message });
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
        const categories = await Category.find({}).sort({ order: 1 });
        res.status(200).json({ success: true, data: categories });
    } catch (err) { res.status(500).json({ message: "Failed" }); }
};

const addCategory = async (req, res) => {
    try {
        // المتوقع في الـ body: { name: { ar: "إلكترونيات", en: "Electronics" } }
        const { name } = req.body;

        const newCategory = await Category.create({ name });
        res.status(201).json({ success: true, data: newCategory });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Failed to add", error: err.message }); 
    }
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
        // المتوقع في subCategoryName: { ar: "هواتف", en: "Mobiles" }

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $push: { subCategories: subCategoryName } }, 
            { new: true }
        );

        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Sub-category added successfully", category });
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

const toggleFeaturedProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // البحث عن المنتج للتأكد من وجوده وجلب حالته الحالية
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // عكس قيمة isFeatured الحالية
    product.isFeatured = !product.isFeatured;
    await product.save();

    res.status(200).json({
      message: `Product is now ${product.isFeatured ? "Featured" : "Unfeatured"}`,
      isFeatured: product.isFeatured,
      product
    });
  } catch (err) {
    console.error("Error toggling product featured status:", err);
    return next(customError({
      statusCode: 500,
      message: "Failed to update product featured status"
    }));
  }
};

// إعادة ترتيب الكاتيجوري
const reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body; // مصفوفة الـ IDs بالترتيب الجديد

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "Invalid data format" });
    }

    // تحديث الترتيب لكل كاتيجوري بناءً على الـ index الجديد
    const updatePromises = orderedIds.map((id, index) => {
      return Category.findByIdAndUpdate(id, { order: index });
    });

    await Promise.all(updatePromises);

    res.status(200).json({ 
      success: true, 
      message: "Categories reordered successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    removeSubCategory,
    toggleFeaturedProduct,
    reorderCategories,
    updateVendorStatus
};
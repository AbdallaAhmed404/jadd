const ProductModel = require("../models/ProductModel");
const customError = require("../customError");
const OrderModel = require("../models/OrderModel"); // هننشئه بعدين
const ContactModel = require("../models/ContactModel");
const axios = require('axios');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Coupon = require('../models/Coupon'); // تأكد من المسار الصحيح للملف
const nodemailer = require('nodemailer');
const { deleteFileFromR2 } = require('../middlewares/r2Upload');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client } = require("@aws-sdk/client-s3");
const Conversation = require('../models/ConversationModel');
const Message = require('../models/MessageModel');
const Identity = require('../models/IdentityModel');
const jwt = require('jsonwebtoken');
const Category = require('../models/CategoryModel');
const Report = require('../models/ReportModel');

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});


// 1. توليد رابط رفع للفرونت إند
const getUploadUrl = async (req, res) => {
    try {
        const { folder, filename, contentType } = req.body;
        if (!folder || !filename || !contentType) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const fileKey = `${folder}/${Date.now()}-${filename}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
        const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;

        res.status(200).json({ signedUrl, publicUrl });
    } catch (error) {
        res.status(500).json({ message: "Signed URL generation failed" });
    }
};


const transporter = nodemailer.createTransport({
  service: 'gmail', // أو الخدمة التي تستخدمها
  auth: {
    user: "jadd.webdev@gmail.com",
    pass: "tmrp qjgc uwxz lees",
  },
});

const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // 1. تحقق هل المستخدم موجود مسبقاً
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "هذا البريد الإلكتروني مسجل بالفعل" });
    }

    // 2. توليد الكود
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 3. إنشاء وحفظ
    const newUser = new User({ fullName, email, password, phone, otp: otpCode });
    await newUser.save();

    // 4. إرسال الإيميل
    await transporter.sendMail({
  from: '"JADD Support" <jadd.webdev@gmail.com>',
  to: email,
  subject: "تفعيل حسابك في JADD",
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    .jadd-font { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; -webkit-font-smoothing: antialiased;">
  <div class="jadd-font" style="background-color: #f8f9fa; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eeeeee;">
      
      <div style="padding: 50px 20px 30px 20px; text-align: center; background-color: #1F1547;">
        <h1 style="color: #ffffff; font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase; margin: 0; font-weight: 800;">
          JADD<span style="color: #D6C88A;">.</span>
        </h1>
        <div style="height: 1px; width: 30px; background-color: #D6C88A; margin: 15px auto 0 auto;"></div>
      </div>

      <div style="padding: 40px;">
        <h2 style="color: #1F1547; font-size: 18px; margin-bottom: 25px; font-weight: 700; text-align: center;">
          Welcome to JADD
        </h2>
        
        <div style="margin-bottom: 30px; font-size: 14px; color: #666666; line-height: 1.8; text-align: center;">
          <p>أهلاً بك <strong>${fullName}</strong>،</p>
          <p>شكراً لانضمامك إلينا. لتفعيل حسابك، يرجى استخدام رمز التحقق أدناه:</p>
        </div>

        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; text-align: center; border: 1px solid #ececec;">
          <span style="font-size: 32px; font-weight: 900; color: #1F1547; letter-spacing: 5px;">${otpCode}</span>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #999999; font-size: 12px;">
          <p>هذا الرمز صالح لفترة محدودة.</p>
        </div>
      </div>

      <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; color: #999999; font-size: 11px;">
        <p style="margin: 0; font-weight: bold; color: #1F1547;">JADD PREMIUM SERVICES</p>
        <p style="margin: 10px 0 0 0;">Oman's Specialized Network // Muscat</p>
      </div>
    </div>
  </div>
</body>
</html>`
});

    res.status(201).json({ message: "تم إرسال كود التحقق إلى إيميلك" });

  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({ message: "حدث خطأ في السيرفر", error: error.message });
  }
};

// authController.js - دالة الـ Verify
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.otp !== otp) {
    return res.status(400).json({ message: "كود التحقق غير صحيح" });
  }

  // إذا كان صحيحاً، نحدث الحالة
  user.isVerified = true;
  user.otp = undefined; // مسح الكود بعد استخدامه
  await user.save();

  // توليد التوكن بعد التحقق
  const token = await user.generatetoken();

  res.status(200).json({ message: "تم تفعيل الحساب بنجاح", token });
};

// 2. تسجيل الدخول
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Search for the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 2. Check if the account is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Account not verified. Please check your email for the verification code.",
        needsVerification: true 
      });
    }

    // 3. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 4. Generate token
    const token = await user.generatetoken();

    res.status(200).json({
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error, please try again later.", 
      error: error.message 
    });
  }
};

 const isVerifiedSeller = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("verificationStatus");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // نرسل الحالة كاملة للفرونت
    res.json({ status: user.verificationStatus }); 
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const addProduct = async (req, res) => {
    try {
        const { title, description, price, category, condition, images, video } = req.body;
        const userId = req.user.id; // استخراج الـ ID من الميدل وير

        const newProduct = await ProductModel.create({
            userId, title, description, price, category, condition, images, video
        });

        res.status(201).json({ message: "Product listed successfully", product: newProduct });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// 🧱 عرض كل المنتجات
const AllProduct = async (req, res, next) => {
  try {
    const products = await ProductModel.find({});
    res.json(products);
  } catch (err) {
    console.error("Error retrieving products:", err);
    return next(customError({
      statusCode: 500,
      message: "Failed to retrieve products"
    }));
  }
};



const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, location, phone, profileImage, oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (profileImage) user.profileImage = profileImage;

    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Wrong password" });
      user.password = newPassword
    }

    await user.save();
    res.json({ message: "Updated", user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 🧾 استقبال الطلب من المستخدم (بدون login)

const makeOrder = async (req, res) => {
  try {
    const { userData, items, appliedCouponCode, total, user, isGuest, trafficSource } = req.body;

    // مراجعة الـ items القادمة من الفرونت إند
    // تأكد أن مصفوفة items تحتوي بالفعل على isPreOrder و depositAmount
    const formattedItems = items.map(item => ({
      productId: item._id,
      name: item.name,
      photo: item.photo,
      price: item.price,
      quantity: item.quantity,
      colorCode: item.colorCode,
      isPreOrder: item.isPreOrder || false,     // حفظ الحالة
      depositAmount: item.depositAmount || 0    // حفظ قيمة العربون
    }));

    const newOrder = new OrderModel({
      user: user || null,
      userData,
      trafficSource: trafficSource || {},
      items: formattedItems, // استخدم المصفوفة المهيأة
      total,
      appliedCouponCode,
      isGuest,
      status: "Pending",
      paymentStatus: "Unpaid" // الحالة الافتراضية
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order saved successfully!",
      _id: newOrder._id,
    });
  } catch (error) {
    console.error("❌ Error saving order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id; // أو استلامه من req.user إذا كنت تستخدم Middleware للتحقق

    // التأكد من إرسال الـ ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // البحث عن الطلبات المرتبطة بهذا المستخدم
    // .sort({ createdAt: -1 }) لجعل الطلبات الأحدث تظهر في الأول
    const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders
    });

  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findById(id).populate('userId', 'fullName'); // تأكد من اسم الحقل في موديل User
    
    if (!product) return res.status(404).json({ message: "Product not found" });

    const relatedProducts = await ProductModel.find({ 
      userId: product.userId._id, 
      _id: { $ne: id } 
    }).limit(4);

    res.json({ product, relatedProducts });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params; // القيمة القادمة مثلاً: "electronics"
    
    // استخدام $regex مع الخيار 'i' لجعل البحث غير حساس لحالة الأحرف
    // هذا سيجعل البحث يطابق "Electronics", "electronics", "ELECTRONICS"
    const products = await ProductModel.find({ 
      category: { $regex: new RegExp(`^${category}$`, 'i') } 
    });

    if (products.length === 0)
      return res.status(404).json({ message: "No products found in this category" });

    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    return next(customError({
      statusCode: 500,
      message: "Failed to fetch products by category"
    }));
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id; // مفترض أنك تستخدم middleware للتوثيق

    const user = await User.findById(userId);
    
    const isFavorite = user.favorites.includes(productId);

    if (isFavorite) {
      // إزالة إذا كان موجوداً
      user.favorites = user.favorites.filter(id => id.toString() !== productId);
    } else {
      // إضافة إذا لم يكن موجوداً
      user.favorites.push(productId);
    }

    await user.save();
    res.status(200).json({ favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: "Error updating favorites" });
  }
};

// عرض المنتجات المفضلة للمستخدم
const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('favorites'); // عرض بيانات المنتج كاملة
    
    res.status(200).json(user.favorites);
  } catch (err) {
    res.status(500).json({ message: "Error fetching favorites" });
  }
};


const accessChat = async (req, res) => {
  const { receiverId, productId } = req.body;
  const senderId = req.user.id;
  try {
    let conversation = await Conversation.findOne({
      productId: productId,
      participants: { $all: [senderId, receiverId] }
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        productId: productId
      });
    }
    res.status(200).json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Error accessing chat" });
  }
};

const sendMessage = async (req, res) => {
  const { conversationId, text } = req.body;
  const senderId = req.user.id; // نأخذ الـ ID من الـ Token مباشرة
  // ... باقي الكود
  try {
    const newMessage = await Message.create({
      conversationId,
      senderId,
      text
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text
    });

    // التعديل هنا: إرسال الرسالة للطرف الآخر في الغرفة لحظياً
    req.io.to(conversationId).emit('receive_message', newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ message: "Error sending message" });
  }
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  try {
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};



const getUserConversations = async (req, res) => {
    try {
        const userId = req.user.id; // مفترض أنك تستخدم Middleware لاستخراج المستخدم
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'fullName profileImage');

        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                isRead: false,
                senderId: { $ne: userId } // الرسائل التي لم يرسلها المستخدم الحالي
            });
            return { ...conv.toObject(), unreadCount };
        }));

        res.json(conversationsWithUnread);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. جلب إجمالي عدد الرسائل غير المقروءة للمستخدم (للـ Navbar)
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // نجيب كل المحادثات اللي مشترك فيها
        const userConversations = await Conversation.find({ participants: userId });
        const conversationIds = userConversations.map(c => c._id);

        // نحسب مجموع الرسائل غير المقروءة في كل هذه المحادثات
        const totalUnread = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            isRead: false,
            senderId: { $ne: userId }
        });

        res.json({ totalUnread });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const submitIdentity = async (req, res) => {
    try {
        // 1. فك تشفير التوكن
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'key');
        const userId = decoded.id;

        const { idImages } = req.body;

        // 2. حفظ طلب الهوية
        const newIdentity = new Identity({
            userId,
            idImages
        });
        await newIdentity.save();

        // 3. تحديث حالة المستخدم إلى 'pending'
        await User.findByIdAndUpdate(userId, { 
            verificationStatus: 'pending' 
        });

        res.status(201).json({ message: "Identity submitted and status updated to pending" });
    } catch (error) {
        console.error("Submission error:", error);
        res.status(500).json({ message: "Submission failed" });
    }
};

const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: categories });
    } catch (err) { res.status(500).json({ message: "Failed" }); }
};

 const getSellerProfile = async (req, res) => {
  try {
    const { userId } = req.params; // الحصول على الـ ID من الرابط

    // 1. جلب بيانات المستخدم
    const user = await User.findById(userId).select('-password'); // استبعاد الباسورد للأمان

    if (!user) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 2. جلب جميع المنتجات الخاصة بهذا المستخدم
    const products = await ProductModel.find({ userId: userId }).sort({ createdAt: -1 });

    // 3. إرجاع البيانات في كائن واحد
    res.status(200).json({
      seller: user,
      listings: products
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const addReview = async (req, res) => {
  try {
    const { userId } = req.params; // صاحب البروفايل
    const { rating, comment } = req.body;
    const reviewerId = req.user.id; // الشخص اللي بيكتب التقييم

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.reviews.push({ reviewer: reviewerId, rating, comment });
    await user.save();

    res.status(201).json({ message: "Review added successfully", reviews: user.reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// جلب التقييمات الخاصة بمستخدم معين
const getReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('reviews.reviewer', 'fullName profileImage');
    
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addReport = async (req, res) => {
  try {
    const { content } = req.body;
    const reportedUser = req.params.id; // المتبلغ عنه من البرامس
    const reporter = req.user.id; // اللي بلغ من الميدل وير

    const newReport = new Report({
      reporter,
      reportedUser,
      content
    });

    await newReport.save();
    res.status(201).json({ message: "Report submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUploadUrl,
  addProduct,
  AllProduct,
  makeOrder,
  getProductById,
  getProductsByCategory,
  register,
  verifyOtp,
  login,
  getUserProfile,
  getUserOrders,
  isVerifiedSeller,
  toggleFavorite,
  getFavorites,
  accessChat,
  sendMessage,
  getMessages,
  getUserConversations,
  getUnreadCount,
  submitIdentity,
  getAllCategories,
  updateProfile,
  getSellerProfile,
  addReview, 
  getReviews,
  addReport,
  
};

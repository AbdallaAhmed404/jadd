const ProductModel = require("../models/ProductModel");
const customError = require("../customError");
const axios = require('axios');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
const Offer = require('../models/OfferModel');
const Notification = require("../models/Notification");

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
    const { fullName, email, password, confirmPassword, phone } = req.body;

    // 1. تحقق هل المستخدم موجود مسبقاً
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "هذا البريد الإلكتروني مسجل بالفعل" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "كلمة المرور غير متطابقة مع تأكيد كلمة المرور" });
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

    // 3. Compare passwords first (قبل التحقق من التفعيل أو أثناءه حسب رغبتك، الأفضل التحقق منها لتأمان الحساب)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 2. Check if the account is verified
    if (!user.isVerified) {
      // توليد كود OTP جديد وتحديثه للمستخدم
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      user.otp = otpCode;
      await user.save();

      // إرسال الإيميل بكود التحقق الجديد
      await transporter.sendMail({
        from: '"JADD Support" <jadd.webdev@gmail.com>',
        to: email,
        subject: "إعادة إرسال رمز تفعيل حسابك في JADD",
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
          Account Verification
        </h2>
        <div style="margin-bottom: 30px; font-size: 14px; color: #666666; line-height: 1.8; text-align: center;">
          <p>أهلاً بك <strong>${user.fullName}</strong>،</p>
          <p>لقد طلبت تسجيل الدخول لحساب غير مفعل. يرجى استخدام رمز التحقق الجديد أدناه لتفعيل حسابك:</p>
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

      return res.status(403).json({
        message: "Account not verified. A new verification code has been sent to your email.",
        needsVerification: true
      });
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
    const { title, description, price, category, condition, images, video, location, isNegotiable } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: "You must be verified to list a product" });
    }

    // الشرط الوحيد الإجباري الآن هو الموقع الجغرافي
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: "Product location is required" });
    }

    const newProduct = await ProductModel.create({
      userId,
      title: title || "",
      description: description || "",
      price: price || 0,
      category: category || null,
      condition: condition || "New",
      images: images || [],
      video: video || "",
      location,
      isNegotiable: isNegotiable || false,
    });

    const populatedProduct = await ProductModel.findById(newProduct._id).populate('category');

    res.status(201).json({ message: "Product listed successfully", product: populatedProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧱 عرض كل المنتجات
const AllProduct = async (req, res, next) => {
  try {
    const products = await ProductModel.find({
      isHidden: { $ne: true }
    }).populate('category');

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





const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const token = req.headers.authorization?.split(" ")[1];
    let currentUserId = null;
    if (token) {
      const decoded = jwt.verify(token, 'key'); // تأكد من مطابقة مفتاح الـ JWT الخاص بك
      currentUserId = decoded.id;
    }

    // 1. التقاط الـ IP الخاص بالجهاز أوتوماتيكياً من الـ Request
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 2. نبحث عن المنتج أولاً لمعرفة من هو مالكه
    let product = await ProductModel.findById(id).populate({
      path: 'userId',
      select: 'fullName reviews'
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    // 3. التحقق مما إذا كان المستخدم الحالي هو مالك المنتج
    const isOwner = currentUserId && product.userId && product.userId._id.toString() === currentUserId.toString();

    // تأكد من وجود مصفوفة viewLogs لمنع الأخطاء لو المنتج قديم
    if (!product.viewLogs) product.viewLogs = [];

    // 4. إذا لم يكن هو المالك، نطبق شروط الـ 30 دقيقة بناءً على الـ IP
    if (!isOwner) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      // نبحث هل الـ IP ده موجود مسبقاً في سجلات الزيارات للمنتج؟
      const viewerIndex = product.viewLogs.findIndex(v => v.ip === clientIp);

      let shouldIncrement = false;

      if (viewerIndex === -1) {
        // لو أول مرة هذا الجهاز يزور المنتج، نسجل الـ IP ونزود الفيو
        product.viewLogs.push({
          ip: clientIp,
          viewedAt: new Date()
        });
        shouldIncrement = true;
      } else if (product.viewLogs[viewerIndex].viewedAt < thirtyMinutesAgo) {
        // لو الجهاز زاره قبل كده بس عدى 30 دقيقة، نحدث وقته ونزود الفيو
        product.viewLogs[viewerIndex].viewedAt = new Date();
        shouldIncrement = true;
      }

      if (shouldIncrement) {
        product = await ProductModel.findByIdAndUpdate(
          id,
          { 
            $inc: { viewsCount: 1 },
            $set: { viewLogs: product.viewLogs }
          },
          { new: true }
        ).populate({
          path: 'userId',
          select: 'fullName reviews'
        });
      }
    }

    // حساب متوسط التقييمات وعدد المراجعين للبائع
    let averageRating = 0;
    let reviewsCount = 0;

    if (product.userId && product.userId.reviews && product.userId.reviews.length > 0) {
      reviewsCount = product.userId.reviews.length;
      const totalRating = product.userId.reviews.reduce((sum, rev) => sum + rev.rating, 0);
      averageRating = (totalRating / reviewsCount).toFixed(1);
    }

    let myOffers = [];
    if (currentUserId && !isOwner) { // لا نحتاج لجلب العروض إذا كان هو المالك
      myOffers = await Offer.find({ productId: id, buyerId: currentUserId });
    }

    const relatedProducts = await ProductModel.find({
      userId: product.userId._id,
      _id: { $ne: id },
      isHidden: { $ne: true }
    }).limit(4);

    // إرسال البيانات ومعها متغير isOwner
    res.json({
      product,
      relatedProducts,
      myOffers,
      sellerStats: { averageRating, reviewsCount },
      isOwner // <-- إرسال القيمة للفرونت إند
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const matchingCategory = await Category.findOne({
      "name.en": { $regex: new RegExp(`^${category}$`, 'i') }
    });

    if (!matchingCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // جلب المنتجات ومعها إحداثياتها (product.location) بدون حساب مسافات في السيرفر
    let products = await ProductModel.find({
      category: matchingCategory._id,
      isHidden: { $ne: true }
    })
      .populate('category')
      .lean();

    if (products.length === 0)
      return res.status(404).json({ message: "No products found in this category" });

    // إرسال المنتجات كما هي للفرونت إند، وهو سيقوم بحساب المسافة محلياً
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    return next(customError({
      statusCode: 500,
      message: "Failed to fetch products by category"
    }));
  }
};

// دالة حساب المسافة
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id; // مفترض أنك تستخدم middleware للتوثيق

    const user = await User.findById(userId);

    const isFavorite = user.favorites.includes(productId);

    if (isFavorite) {
      // إزالة إذا كان موجوداً
      user.favorites = user.favorites.filter(id => id.toString() !== productId);
      // 2. إنقاص العداد في موديل المنتج
      await ProductModel.findByIdAndUpdate(productId, { $inc: { favoritesCount: -1 } });

    } else {
      // إضافة إذا لم يكن موجوداً
      user.favorites.push(productId);
      // 2. زيادة العداد في موديل المنتج
      await ProductModel.findByIdAndUpdate(productId, { $inc: { favoritesCount: 1 } });

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

  try {
    // 1. حفظ الرسالة الجديدة
    const newMessage = await Message.create({
      conversationId,
      senderId,
      text
    });

    // 3. تحديث آخر رسالة في المحادثة
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text
    });

    // 4. إرسال الرسالة للطرف الآخر في الغرفة لحظياً
    if (req.io) {
      req.io.to(conversationId).emit('receive_message', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
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
      .populate('participants', 'fullName profileImage').populate('productId', 'title images');;

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

    // جلب معرفات المحادثات التي يشارك فيها المستخدم
    const userConversations = await Conversation.find({ participants: userId });
    const conversationIds = userConversations.map(c => c._id);

    // التحقق مما إذا كانت هناك رسالة واحدة على الأقل غير مقروءة
    const hasUnread = await Message.exists({
      conversationId: { $in: conversationIds },
      isRead: false,
      senderId: { $ne: userId }
    });

    // إرجاع قيمة منطقية (true إذا وجد رسائل، أو false إذا لم يوجد)
    // أو إرجاع كائن يحتوي على hasUnread بـ true/false
    res.json({ hasUnread: !!hasUnread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const submitIdentity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { idImages, nationalId } = req.body; // <--- استقبل nationalId هنا

    // 2. حفظ طلب الهوية مع الرقم القومي
    const newIdentity = new Identity({
      userId,
      nationalId, // <--- حفظه في القاعدة
      idImages
    });
    await newIdentity.save();

    // 3. تحديث حالة المستخدم إلى 'pending'
    await User.findByIdAndUpdate(userId, {
      verificationStatus: 'pending'
    });

    // 4. إرسال إيميل إشعار بوجود طلب جديد
    const mailOptions = {
      from: '"JADD Platform" <jadd.webdev@gmail.com>',
      to: 'jadd.webdev@gmail.com', // الإيميل الذي ستستقبل عليه الإشعارات
      subject: 'طلب التحقق من الهوية جديد',
      text: `مرحباً، تم استلام طلب تحقيق هوية جديد.\nالرقم القومي: ${nationalId}\nيرجى مراجعة الطلب من لوحة التحكم.`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Identity submitted, status updated to pending, and notification email sent" });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ message: "Submission failed" });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (err) { res.status(500).json({ message: "Failed" }); }
};

const getSellerProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. جلب بيانات المستخدم مع جلب مصفوفة التقييمات reviews وزيادة عدد المشاهدات
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { views: 1 } },
      { new: true }
    ).select('-password').populate({
      path: 'reviews.reviewer',
      select: 'fullName profileImage'
    });

    if (!user) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 2. حساب متوسط التقييمات وعددها للبائع
    let averageRating = 0;
    let reviewsCount = 0;

    if (user.reviews && user.reviews.length > 0) {
      reviewsCount = user.reviews.length;
      const totalRating = user.reviews.reduce((sum, rev) => sum + rev.rating, 0);
      averageRating = (totalRating / reviewsCount).toFixed(1);
    }

    // 3. جلب منتجات المستخدم والإحصائيات الأخرى
    const allProducts = await ProductModel.find({ userId: userId }).sort({ createdAt: -1 });

    const totalListingsCount = allProducts.length;
    const soldProductsCount = allProducts.filter(p => p.status === 'Sold' || p.buyer !== null).length;
    const boughtProductsCount = await ProductModel.countDocuments({ buyer: userId });

    const visibleProducts = allProducts.filter(p => !p.isHidden);

    // 4. إرسال البيانات ومعها sellerStats
    res.status(200).json({
      seller: user,
      listings: visibleProducts,
      stats: {
        totalListings: totalListingsCount,
        soldListings: soldProductsCount,
        boughtListings: boughtProductsCount
      },
      sellerStats: { averageRating, reviewsCount } // <-- إضافة إحصائيات التقييمات هنا
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

    await Notification.create({
      userId: userId, // صاحب البروفايل هو المستلم
      title: {
        ar: "تقييم جديد",
        en: "New Review"
      },
      message: {
        ar: `لقد تلقيت تقييماً جديداً برمز ${rating} نجوم على ملفك الشخصي.`,
        en: `You have received a new ${rating}-star review on your profile.`
      },
      type: "review", // متوافقة مع الـ Enum في الـ Schema الخاصة بالإشعارات
      relatedId: user._id, // ربط الإشعار بالمستخدم أو البروفايل
      isRead: false
    });

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
    const { content, productId } = req.body;
    const reportedUser = req.params.id; // المتبلغ عنه من البرامس
    const reporter = req.user.id; // اللي بلغ من الميدل وير

    const newReport = new Report({
      reporter,
      reportedUser,
      content,
      product: productId || null
    });

    await newReport.save();
    res.status(201).json({ message: "Report submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getSellerDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // جلب بيانات البائع مع تضمين حقل verificationStatus
    const user = await User.findById(userId).select('fullName views verificationStatus');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // جلب جميع منتجات هذا البائع
    const products = await ProductModel.find({ userId: userId }).populate('buyer');

    // التحقق مما إذا كانت حالة التحقق تساوي 'verified'
    const isVerified = user.verificationStatus === 'verified';

    // إرسال الداتا للفرونت إند مع إضافة isVerified
    res.status(200).json({
      seller: {
        name: user.fullName,
        views: user.views || 0,
        isVerified: isVerified // سترجع true إذا كان verified وإلا false
      },
      products: products
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { buyerId } = req.body; // استقبال المشتري عند التحويل إلى Sold
    const product = await ProductModel.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // المنطق الجديد:
    // إذا كان Reserved يتحول إلى Sold ويُربط بالمشتري
    if (product.status === 'Reserved') {
      product.status = 'Sold';
      if (buyerId) {
        product.buyer = buyerId;
      }
    }
    // إذا كان Sold يتحول إلى Reserved ويتم إزالة المشتري
    else if (product.status === 'Sold') {
      product.status = 'Reserved';
      product.buyer = null;
    }
    // إذا كان Available لا يتغير من هنا (أو يمكنك تركها كما هي حسب رغبتك)

    await product.save();

    res.status(200).json({ message: "Status updated", status: product.status, product });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error: error.message });
  }
};

const toggleHiddenStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id; // الـ ID بتاع البائع المسجل دخول (من الـ Middleware الخاص بالـ Auth)

    // البحث عن المنتج والتأكد أنه يخص نفس المستخدم حتي لا يتم التعديل بواسطة شخص آخر
    const product = await ProductModel.findOne({ _id: productId, userId: userId });

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    // تبديل القيمة (لو كانت true تخليها false والعكس صحيح)
    product.isHidden = !product.isHidden;
    await product.save();

    res.status(200).json({
      message: "Hidden status updated successfully",
      isHidden: product.isHidden,
      product
    });
  } catch (err) {
    console.error("Error toggling hidden status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// دالة حذف المنتج
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 1. حذف أي محادثات مرتبطة بهذا المنتج
    await Conversation.deleteMany({ productId: productId });

    // 2. حذف أي عروض (Offers) مرتبطة بهذا المنتج
    await Offer.deleteMany({ productId: productId });

    // 3. حذف المنتج نفسه
    await ProductModel.findByIdAndDelete(productId);

    res.status(200).json({ message: "Product and its related conversations and offers deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

const createOffer = async (req, res) => {
  try {
    const { productId, sellerId, offerPrice } = req.body;
    const buyerId = req.user.id; // من الميدل وير

    const newOffer = new Offer({ productId, buyerId, sellerId, offerPrice });
    await newOffer.save();

    await Notification.create({
      userId: sellerId,
      title: {
        ar: "عرض سعر جديد",
        en: "New Price Offer"
      },
      message: {
        ar: `تم تقديم عرض سعر جديد بقيمة ${offerPrice} على منتجك.`,
        en: `A new price offer of ${offerPrice} has been submitted on your product.`
      },
      type: "offer_received",
      relatedId: newOffer._id,
      isRead: false
    });

    res.status(201).json({ message: "Offer submitted successfully", offer: newOffer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getSellerOffers = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const offers = await Offer.find({ sellerId }).populate('productId buyerId', 'title fullName');
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateOfferStatus = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { status } = req.body; // يجب أن تكون 'accepted' أو 'rejected'

    // التحقق من أن الحالة المدخلة صحيحة
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // إذا كانت الحالة 'rejected'، نقوم بحذف العرض مباشرة
    if (status === 'rejected') {
      // أولاً نبحث عن العرض لنحصل على بياناته (مثل productId و buyerId و offerPrice) قبل حذفه
      const offer = await Offer.findById(offerId);

      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      // حذف العرض من قاعدة البيانات
      await Offer.findByIdAndDelete(offerId);

      // تحديث حالة المنتج ليصبح متاحاً
      await ProductModel.findByIdAndUpdate(offer.productId, { status: 'Available' });

      // إرسال إشعار للمشتري برفض وحذف العرض
      await Notification.create({
        userId: offer.buyerId,
        title: {
          ar: "تم رفض عرض السعر",
          en: "Offer Rejected"
        },
        message: {
          ar: `للأسف، قام البائع برفض عرض السعر الخاص بك بقيمة ${offer.offerPrice}.`,
          en: `Unfortunately, the seller has rejected your price offer of ${offer.offerPrice}.`
        },
        type: "offer_rejected",
        relatedId: offer._id,
        isRead: false
      });

      return res.status(200).json({ message: "Offer rejected and deleted successfully" });
    }

    // أما لو الحالة 'accepted' (تكمل بشكل طبيعي)
    const offer = await Offer.findByIdAndUpdate(
      offerId,
      { status },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (status === 'accepted') {
      await ProductModel.findByIdAndUpdate(offer.productId, { status: 'Reserved' });
    }

    res.status(200).json({ message: `Offer ${status} successfully`, offer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserLocation = async (req, res) => {
  try {
    const userId = req.user.id; // يأتي من الـ Middleware الخاص بالـ Authentication
    const { address, latitude, longitude } = req.body;

    // التحقق أو استقبال البيانات وإرسالها للموديل
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "location.address": address || "",
          "location.latitude": latitude || null,
          "location.longitude": longitude || null
        }
      },
      { new: true } // ليرجع البيانات بعد التحديث
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث الموقع بنجاح",
      location: updatedUser.location
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // نأخذ الـ ID من الـ Token مباشرة

    const notifications = await Notification.find({ userId, isRead: false })
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .limit(20); // جلب آخر 20 إشعاراً غير مقروء

    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// 2. تحديث إشعار معين لصبح مقروء (isRead: true)
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params; // معرف الإشعار

    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true } // ليعيد البيانات بعد التحديث
    );

    if (!updatedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification: updatedNotification
    });
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ message: "Error updating notification" });
  }
};

// Controller: قراءة كل إشعارات المستخدم
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // استخراج معرف المستخدم من التوكن

    await Notification.updateMany(
      { userId: userId, isRead: false }, // استخدام userId المطابق للـ Schema وتحديث غير المقروءة فقط
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ message: "Error updating notifications" });
  }
};

const checkProductBuyerAndUser = async (req, res) => {
  try {
    const buyerId = req.user.id; // معرف المشتري المستخرج من التوكن
    const userId = req.params.id; // معرف البائع المستخرج من الـ Params

    // البحث عما إذا كان هناك منتج يحقق الشرطين معاً (مع الاستفادة من الـ Index الذي تم إضافته)
    const productExists = await ProductModel.findOne({
      userId: userId,
      buyer: buyerId
    });

    if (productExists) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }

  } catch (err) {
    console.error("Error checking product:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({ _id: messageId, senderId: userId });

    if (!message) {
      return res.status(404).json({ success: false, message: "الرسالة غير موجودة أو ليس لديك صلاحية لحذفها" });
    }

    const conversationId = message.conversationId; // نحفظ معرف المحادثة عشان نبعث للسوكيت
    await Message.findByIdAndDelete(messageId);

    // ⚡ إرسال حدث الحذف لكل المتصلين في نفس المحادثة لحظياً
    if (req.io) {
      req.io.to(conversationId.toString()).emit('message_deleted', { messageId, conversationId });
    }

    return res.status(200).json({ success: true, message: "تم حذف الرسالة بنجاح" });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ أثناء حذف الرسالة" });
  }
};

const getRecommendedFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    // جلب المستخدم مع المفضلة وتصنيفاتها
    const user = await User.findById(userId).populate({
      path: 'favorites',
      populate: { path: 'category' }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // إذا لم تكن هناك مفضلات أصلاً، نرجع مصفوفة فارغة
    if (!user.favorites || user.favorites.length === 0) {
      return res.status(200).json([]);
    }

    // 1. استخراج الـ IDs الخاصة بالكاتيجوري للمنتجات المفضلة
    const categoryIds = user.favorites
      .map(product => product.category?._id || product.category)
      .filter(Boolean);

    // إزالة التكرار من الـ IDs
    const uniqueCategoryIds = [...new Set(categoryIds)];

    let recommended = [];

    // 2. البحث فقط بناءً على الكاتيجوري وبشرط ألا تكون في المفضلة وألا تكون مخفية
    if (uniqueCategoryIds.length > 0) {
      recommended = await ProductModel.find({
        category: { $in: uniqueCategoryIds },             // نفس الكاتيجوري فقط
        _id: { $nin: user.favorites.map(p => p._id) },   // ليست موجودة في المفضلة (لتجنب التكرار)
        isHidden: false                                    // وليست مخفية
      })
        .limit(4)                                            // 4 منتجات فقط
        .populate('category');
    }

    // إرجاع النتيجة (حتى لو كانت مصفوفة فارغة إذا لم توجد منتجات بنفس الكاتيجوري)
    res.status(200).json(recommended);

  } catch (err) {
    console.error("Error fetching recommendations:", err);
    res.status(500).json({ message: "Error fetching recommendations" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params; // معرف المنتج المراد تعديله
    const { title, description, price, isNegotiable, category, condition, images, video, location } = req.body;

    // 2. البحث عن المنتج والتحقق من أنه يخص المستخدم الحالي
    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 3. التحقق من الموقع الجغرافي (بما أنه إلزامي)
    if (location && (!location.latitude || !location.longitude)) {
      return res.status(400).json({ message: "Product location is required" });
    }

    // 4. تحديث البيانات (استخدام البيانات الجديدة أو الاحتفاظ بالقديمة إن لم تُرسل)
    const updatedData = {
      title: title !== undefined ? title : product.title,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? price : product.price,
      isNegotiable: isNegotiable !== undefined ? isNegotiable : product.isNegotiable, // <-- أضف هذا السطر
      category: category !== undefined ? category : product.category,
      condition: condition !== undefined ? condition : product.condition,
      images: images !== undefined ? images : product.images,
      video: video !== undefined ? video : product.video,
      location: location !== undefined ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address !== undefined ? location.address : product.location?.address // <-- حفظ اسم المكان النصي
      } : product.location
    };

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    ).populate('category');

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please enter the email address." });
  }

  try {
    // 1. 🔍 التحقق من وجود المستخدم
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found with this email address." });
    }

    // 2. 🔑 إنشاء رمز مميز (Token) لإعادة التعيين (صالح لمدة 10 دقائق)
    const resetToken = jwt.sign({ id: user._id }, "JaddSuperSecretKey12345!_", { expiresIn: '10m' });

    // 3. 💾 حفظ الرمز وتاريخ الانتهاء في قاعدة البيانات
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 600000; // 10 دقائق
    await user.save();

    // 4. 🔗 بناء رابط إعادة التعيين (يمكنك تغييره للرابط المحلي أو رابط الدومين حسب بيئة العمل)
    // لو شغال لوكال للفرونت اند (مثلاً بورت 3000 أو نفس بورت الباك اند):
    const resetURL = `https://joinjadd.com/reset-password/${resetToken}`;
    // أو لو كان الرابط مباشر على الدومين: `https://jadd.om/reset-password/${resetToken}`

    // 5. 📧 إعداد محتوى الإيميل
    const mailOptions = {
      from: '"JADD Support" <jadd.webdev@gmail.com>',
      to: user.email,
      subject: 'JADD - Password Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #1F1547; border-radius: 8px;">
            <h2 style="color: #1F1547;">JADD - Password Reset</h2>
            <p>Dear ${user.fullName || user.name || 'User'},</p>
            <p>We received a request to reset the password for your account registered with this email: <strong>${user.email}</strong>.</p>
            <p>To reset your password, please click the button below. This link is only valid for <strong>10 minutes</strong>.</p>
            <div style="text-align: center; margin: 25px 0;">
                <a href="${resetURL}" 
                    style="display: inline-block; padding: 12px 25px; font-size: 17px; color: white; background-color: #1F1547; text-decoration: none; border-radius: 5px; font-weight: bold;"
                >Click to Reset Password</a>
            </div>
            <p>If you did not request a password reset, please ignore this message.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">JADD Support Team</p>
        </div>
      `,
    };

    // 6. 🚀 إرسال الإيميل عبر Nodemailer
    await transporter.sendMail(mailOptions);

    // 7. ✅ إرسال رد النجاح
    res.status(200).json({
      message: "The password reset link has been sent to your email. Please check your inbox.",
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      message: "The sending operation failed. Please check the email settings and try again."
    });
  }
};

const resetPassword = async (req, res) => {
  // 1. استخلاص التوكن وكلمة المرور الجديدة
  const { token } = req.params; // التوكن الموجود في مسار URL
  const { newPassword } = req.body; // كلمة المرور الجديدة من الـ Frontend

  // 2. التحقق المبدئي من كلمة المرور
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "The password must be at least 6 characters long."
    });
  }

  try {
    // 3. التحقق من التوكن وصلاحيته في قاعدة البيانات
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // التأكد أن وقت الانتهاء لم يمر بعد
    });

    if (!user) {
      return res.status(400).json({
        message: "The password reset link is invalid or has expired. Please request a new link."
      });
    }

    // 4. فك تشفير التوكن للتحقق الإضافي من الـ JWT
    try {
      jwt.verify(token, "JaddSuperSecretKey12345!_");
    } catch (err) {
      return res.status(401).json({
        message: "The password reset link is invalid or has expired."
      });
    }

    // 5. تعيين كلمة المرور الجديدة
    // ملاحظة: لو عندك pre-save hook في الـ User Model بيشفر الباسورد، سيب السطر زي ما هو:
    user.password = newPassword;

    // لو مش معمول pre-save hook، يفضل تشفيرها هنا هكذا:
    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(newPassword, salt);

    // 6. مسح حقول التوكن وانتهاء الصلاحية من قاعدة البيانات حتى لا يتم استخدام الرابط مرة أخرى
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // 7. إرسال رد النجاح
    res.status(200).json({
      message: "Password successfully updated. You can now log in using your new password."
    });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      message: "An unexpected error occurred while updating the password."
    });
  }
};

// جلب العروض التي قدمها المستخدم كمشتري
const getMySentOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // جلب العروض الخاصة بالمشتري مع جلب بيانات المنتج والبائع المرتبطين بها
    const sentOffers = await Offer.find({ buyerId: userId })
      .populate('productId', 'title price images status')
      .populate('sellerId', 'fullName name')
      .sort({ createdAt: -1 });

    res.status(200).json(sentOffers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUploadUrl,
  addProduct,
  AllProduct,
  getProductById,
  getProductsByCategory,
  register,
  verifyOtp,
  login,
  getUserProfile,
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
  getSellerDashboardData,
  toggleProductStatus,
  deleteProduct,
  createOffer,
  getSellerOffers,
  updateOfferStatus,
  updateUserLocation,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  checkProductBuyerAndUser,
  toggleHiddenStatus,
  deleteMessage,
  getRecommendedFavorites,
  updateProduct,
  forgotPassword,
  resetPassword,
  getMySentOffers
};

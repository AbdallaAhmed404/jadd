const express = require('express')
const UserRouter = express.Router()
const authorized = require('../middlewares/Authorized')
const { toggleFavorite, getFavorites, isVerifiedSeller, getUploadUrl, register, verifyOtp
    , login, getUserProfile, addProduct, AllProduct, makeOrder, getUserOrders, getProductById,
    getProductsByCategory, accessChat, sendMessage, getMessages, getUserConversations, getUnreadCount,
    submitIdentity,getAllCategories,updateProfile,getSellerProfile,addReview, getReviews,addReport } = require('../controllers/UserController')

UserRouter.get('/unread-count', authorized, getUnreadCount);
UserRouter.post('/access', authorized, accessChat);
UserRouter.post('/message', authorized, sendMessage);
UserRouter.get('/:conversationId/messages', authorized, getMessages);
UserRouter.get('/conversations', authorized, getUserConversations);
UserRouter.post('/favorites/toggle', authorized, toggleFavorite);
UserRouter.get('/favorites', authorized, getFavorites);
UserRouter.post('/add-product', authorized, addProduct);
UserRouter.post('/get-upload-url', getUploadUrl);
UserRouter.get('/profile-status', authorized, isVerifiedSeller);
UserRouter.get("/my-orders", authorized, getUserOrders);
UserRouter.get('/profile', authorized, getUserProfile);
UserRouter.put('/profile', authorized, updateProfile);
UserRouter.post('/register', register);
UserRouter.post('/verifyOtp', verifyOtp);
UserRouter.post('/login', login);
UserRouter.get("/product/:id", getProductById);
UserRouter.get('/allproduct', AllProduct);
UserRouter.post('/Order', makeOrder);
UserRouter.get('/category/:category', getProductsByCategory);
UserRouter.post('/submit', submitIdentity);
UserRouter.get('/categories', getAllCategories);
UserRouter.get('/sellerProfile/:userId', getSellerProfile);
UserRouter.post('/review/:userId', authorized, addReview);
UserRouter.get('/review/:userId', getReviews);
UserRouter.post('/report/:id', authorized, addReport);

module.exports = UserRouter;












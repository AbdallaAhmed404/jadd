const express = require('express')
const UserRouter = express.Router()
const authorized = require('../middlewares/Authorized')
const { toggleFavorite, getFavorites, isVerifiedSeller, getUploadUrl, register, verifyOtp
    , login, getUserProfile, addProduct, AllProduct , getProductById,
    getProductsByCategory, accessChat, sendMessage, getMessages, getUserConversations, getUnreadCount,
    submitIdentity,getAllCategories,updateProfile,getSellerProfile,addReview, getReviews,addReport,getSellerDashboardData,
    toggleProductStatus,deleteProduct,createOffer, getSellerOffers,updateOfferStatus,updateUserLocation,getUserNotifications,
    markAsRead,markAllAsRead,checkProductBuyerAndUser,toggleHiddenStatus,deleteMessage,getRecommendedFavorites,updateProduct,
    forgotPassword,resetPassword } = require('../controllers/UserController')

UserRouter.post('/forgot-password', forgotPassword);
UserRouter.post('/reset-password/:token', resetPassword);
UserRouter.get('/recommendations', authorized, getRecommendedFavorites);
UserRouter.patch('/update-status/:offerId', authorized, updateOfferStatus);
UserRouter.post('/create', authorized, createOffer);
UserRouter.get('/my-offers', authorized, getSellerOffers);
UserRouter.patch('/updatestatus/:productId', authorized, toggleProductStatus);
UserRouter.delete('/deleteproduct/:productId', authorized, deleteProduct);
UserRouter.get('/seller-dashboard-data', authorized, getSellerDashboardData);
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
UserRouter.get('/profile', authorized, getUserProfile);
UserRouter.put('/profile', authorized, updateProfile);
UserRouter.post('/register', register);
UserRouter.post('/verifyOtp', verifyOtp);
UserRouter.post('/login', login);
UserRouter.get("/product/:id", getProductById);
UserRouter.get('/allproduct', AllProduct);
UserRouter.get('/category/:category', getProductsByCategory);
UserRouter.post('/submit', authorized, submitIdentity);
UserRouter.get('/categories', getAllCategories);
UserRouter.get('/sellerProfile/:userId', getSellerProfile);
UserRouter.post('/review/:userId', authorized, addReview);
UserRouter.get('/review/:userId', getReviews);
UserRouter.post('/report/:id', authorized, addReport);
UserRouter.put('/update-location', authorized, updateUserLocation);
UserRouter.get("/notification", authorized, getUserNotifications);
UserRouter.patch('/notification/read-all', authorized, markAllAsRead);
UserRouter.patch("/notification/:id", authorized, markAsRead);
UserRouter.get('/checkproduct/:id', authorized, checkProductBuyerAndUser);
UserRouter.patch('/toggle-hidden/:productId', authorized, toggleHiddenStatus);
UserRouter.delete('/deleteMessage/:messageId', authorized, deleteMessage);
UserRouter.put('/updateProduct/:id', updateProduct);

module.exports = UserRouter;












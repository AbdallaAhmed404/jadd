const express = require('express')
const AdminRouter = express.Router()
const isAdmin = require('../middlewares/isAdmin');
const {adminLogin,getAllUsers, deleteUser,getAllProducts, deleteProduct,getAllIdentities, deleteIdentity,updateUserVerification
        ,getAllCategories, addCategory, deleteCategory,getReports, deleteReport,addSubCategory,removeSubCategory,
         toggleFeaturedProduct,reorderCategories,updateVendorStatus} = require('../controllers/AdminController')

AdminRouter.post('/login', adminLogin);
AdminRouter.get('/user',isAdmin, getAllUsers);
AdminRouter.delete('/user/:id', deleteUser);
AdminRouter.get('/product',isAdmin, getAllProducts);
AdminRouter.delete('/product/:id', deleteProduct);
AdminRouter.get('/Identitie',isAdmin, getAllIdentities);
AdminRouter.delete('/Identitie/:id', deleteIdentity);
AdminRouter.put('/status/:userId', updateUserVerification);
AdminRouter.get('/categories',isAdmin, getAllCategories);
AdminRouter.post('/categories', addCategory);
AdminRouter.post('/subcategory', addSubCategory);
AdminRouter.delete('/subcategory', removeSubCategory);
AdminRouter.delete('/categories/:id', deleteCategory);
AdminRouter.get('/report',isAdmin, getReports); 
AdminRouter.delete('/report/:id', deleteReport); 
AdminRouter.patch('/toggle-featured/:id', toggleFeaturedProduct);
AdminRouter.put('/categories/reorder', reorderCategories);
AdminRouter.put('/updateVendorStatus/:id', updateVendorStatus);

module.exports = AdminRouter


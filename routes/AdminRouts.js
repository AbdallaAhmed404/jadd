const express = require('express')
const AdminRouter = express.Router()
const isAdmin = require('../middlewares/isAdmin');
const {adminLogin,getAllUsers, deleteUser,getAllProducts, deleteProduct,getAllIdentities, deleteIdentity,updateUserVerification
        ,getAllCategories, addCategory, deleteCategory,getReports, deleteReport,addSubCategory,removeSubCategory} = require('../controllers/AdminController')

AdminRouter.post('/login', adminLogin);
AdminRouter.get('/user', getAllUsers);
AdminRouter.delete('/user/:id', deleteUser);
AdminRouter.get('/product', getAllProducts);
AdminRouter.delete('/product/:id', deleteProduct);
AdminRouter.get('/Identitie', getAllIdentities);
AdminRouter.delete('/Identitie/:id', deleteIdentity);
AdminRouter.put('/status/:userId', updateUserVerification);
AdminRouter.get('/categories', getAllCategories);
AdminRouter.post('/categories', addCategory);
AdminRouter.post('/subcategory', addSubCategory);
AdminRouter.delete('/subcategory', removeSubCategory);
AdminRouter.delete('/categories/:id', deleteCategory);
AdminRouter.get('/report', getReports); 
AdminRouter.delete('/report/:id', deleteReport); 

module.exports = AdminRouter


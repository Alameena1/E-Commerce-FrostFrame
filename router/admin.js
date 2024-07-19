const express= require('express')
const admrouter =express.Router()




const admincontroller = require("../controller/admincontroller")
const isAuth = require('../middleware/usersession').isAdmin




const multer = require('multer');
const fileStorage = multer.diskStorage({
    destination : (req,file,cb) =>{
     cb(null,'uploads');
    },
    filename: (req,file,cb) => {
        console.log(file)
        cb(null,Date.now()+'-'+file.originalname);
    }
}
);
const fileFilter = (req,file,cb) => {
    if(file.mimetype === 'image/png'  || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null,true);
    }else{
        cb(null,false);
    }
};




admrouter.get("/",admincontroller.getlogin)
admrouter.get("/dashbord",isAuth,admincontroller.getdashbord)
admrouter.get("/usermanagement",isAuth,admincontroller.getusermanagement)
admrouter.get("/productmanagement",isAuth,admincontroller.getproductmanagement)
admrouter.get("/categorymanagement",isAuth,admincontroller.getcategorymanagement)
admrouter.get("/add-category",admincontroller.getaddcategorymanagement)
admrouter.get("/editcategory/:_id",admincontroller.geteditcategory)
admrouter.get("/add-product",isAuth,admincontroller.getaddproductmanagement)
admrouter.get("/editProduct/:_id",admincontroller.geteditProduct)
admrouter.get("/logout",admincontroller.logout)
admrouter.get("/order",isAuth,admincontroller.getorder)
admrouter.get("/salesreport",isAuth,admincontroller.getsalesreport)
admrouter.get("/salesPdf",isAuth,admincontroller.getsalesPdf)
admrouter.get("/salesExcel",isAuth,admincontroller.getsalesExcel)
admrouter.get("/coupon",isAuth,admincontroller.getcouponmanagement)
admrouter.get("/addcoupon",isAuth,admincontroller.getaddcoupon)
admrouter.get("/editcoupon/:_id", admincontroller.geteditcoupon);
admrouter.get("/salesfilter", admincontroller.getsalesfilter);



admrouter.post("/",admincontroller.postlogin)
admrouter.post("/categorymanagement",isAuth,admincontroller.postaddcategorymanagement)
admrouter.post("/editcategory/:_id",admincontroller.posteditcategory)

admrouter.post("/add-product", multer({ storage: fileStorage, fileFilter: fileFilter }).array("product_image", 3), admincontroller.postaddproductmanagement);
admrouter.post("/block-user/:_id", admincontroller.postBlockUser);
admrouter.post("/block-product/:_id", admincontroller.postBlockproduct);
admrouter.post("/block-category/:_id", admincontroller.postBlockCategory);
admrouter.post("/editProduct/:_id", multer({ storage: fileStorage, fileFilter: fileFilter }).array("product_image", 3), admincontroller.postEditProduct);
admrouter.post("/change-status/:orderId", admincontroller.changestatus);
admrouter.post("/addcoupon", admincontroller.postaddcoupon);
admrouter.post("/editcoupon/:_id",admincontroller.posteditcoupon)




admrouter.delete("/deletecoupon/:_id",admincontroller.deleteCoupon)




   








module.exports = admrouter;
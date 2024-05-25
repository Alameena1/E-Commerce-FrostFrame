const express = require("express");
const router = express.Router();
const usercontroller = require('../controller/usercontroller');
const passport = require("passport");
const isAuth = require('../middleware/usersession').isUser
const passportSetup = require('../config/passport-setup')
const nocache = require("nocache");

router.get("/signup",usercontroller.getsignup);
router.get("/otp",usercontroller.getotp);
router.get("/login",nocache(),usercontroller.getlogin)
router.get("/",usercontroller.gethomepage)
router.get("/sunglass",isAuth,usercontroller.getsunglass)
router.get("/google",passport.authenticate('google',{scope:['profile','email']}))
router.get("/google/redirect",passport.authenticate('google',{failureRedirect: '/login'}),usercontroller.getgoogle)
router.get("/productDetails/:id",isAuth,usercontroller.getproduct)
router.get("/cart",isAuth,usercontroller.getCart)
router.get("/forget",usercontroller.getforget)
router.get("/newpassword",usercontroller.getnewpassword)
router.get("/profile",isAuth,usercontroller.getProfile)
router.get("/address",usercontroller.getaddress)
router.get("/checkout",usercontroller.getcheckout)
router.get("/success",usercontroller.getsuccess)
router.get("/order",usercontroller.getorder)
router.get("/orderdetails/:id",usercontroller.getorderdetails)
router.get("/changepassword",usercontroller.changepassword)
router.get("/wishlist",usercontroller.getwishlist)
router.get("/wallet",usercontroller.getwallet)
router.get("/coupon",usercontroller.getcoupon)
router.get("/validateCoupon/:id",usercontroller.getvalidateCoupon);











router.post("/signup",usercontroller.postsignup);
router.post("/otp",usercontroller.postotp)
router.post("/login",usercontroller.postlogin)
router.post("/logout",usercontroller.postlogout)
router.post("/forget",usercontroller.postforget)
router.post("/newpassword",usercontroller.postnewpassword)
router.post("/updateProfile",usercontroller.postupdateProfile)
router.post("/addAddress",usercontroller.addAddress)
router.post("/addProductCart/:id", usercontroller.addProductCart);
router.post("/checkout", usercontroller.postcheckout);
router.post("/resendotp", usercontroller.postresendotp);
router.post('/cancel-item/:orderId/:productId', isAuth, usercontroller.cancelOrder);
router.post("/changepassword",usercontroller.postchangepassword)
router.post("/addtowishlist",usercontroller.postaddtowishlist)
router.post("/razorpay",usercontroller.postrazorpay)
router.post("/razorpay-success",usercontroller.postrazorpaysuccess)






router.put("/updateAddress/:id", usercontroller.updateAddress);
router.delete('/deleteAddress/:id', usercontroller.deleteAddress);
router.delete('/cartRemove/:id', usercontroller.cartRemove);
router.put('/updateQuantity/:id', usercontroller.updateQuantity);




module.exports = router;
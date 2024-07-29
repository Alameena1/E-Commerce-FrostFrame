const collection = require('../model/user');
const collectionotp = require('../model/otp');
const category = require("../model/category")
const product = require("../model/product")
const User = require("../model/user")
const Address = require("../model/address")
const Cart = require("../model/cart")
const Order = require('../model/order');
const Wishlist = require('../model/wishlist');
const crypto = require("crypto");
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


const razorpay = new Razorpay({
    key_id: 'rzp_test_oPgTEPwxJqVllq',
    key_secret: 'WjFOngwE8prOR9gjMRku1'
});

const nodemailerr = require("nodemailer");
const { authenticator } = require("otplib");
const nodemailer = require('nodemailer');
const randomstring = require("randomstring")
require("dotenv").config();
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const mongoose = require("mongoose")

const express = require("express");
const user = require('../model/user');
const Coupon = require('../model/coupon');
const { Console } = require('console');
const router = express.Router();

let secret = authenticator.generateSecret();
let token = authenticator.generate(secret);





const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.usern,
        pass: process.env.PASSWORD
    }
});


const getsignup = (req, res) => {

    if (req.session.user) {
        return res.redirect("/")
    }
    res.render('user/signup', { errorMessage: req.flash("error") });
};

const postsignup = async (req, res) => {
    try {
        let walletamount = 0;
        const rf = req.body.referralCode;

        if (rf) {
            const referral = await User.findOne({ referralCode: rf });
            if (referral) {

                walletamount = 50;
            } else {
                req.flash("error", "Referral code not found");
                return res.render('user/signup', { errorMessage: req.flash("error") });
            }
        }

        const referralCode = crypto.randomBytes(6).toString('hex');

        const data = {
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            referralCode: referralCode,
            wallet: {
                balance: walletamount,
                transactions: []
            },
            refferedCode: rf
        };

        const existingUser = await collection.findOne({ email: data.email });

        if (existingUser) {
            req.flash("error", "Email already exists");
            return res.redirect("/signup");
        } else {
            req.session.userData = data;

            res.redirect("/otp");

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                host: "smtp.gmail.email",
                port: 587,
                secure: false,
                auth: {
                    user: process.env.usern,
                    pass: process.env.PASSWORD
                },
            });

            const mailOptions = {
                from: {
                    name: 'frostframe',
                    address: process.env.usern
                },
                to: req.session.userData.email,
                subject: "OTP verification✔",
                text: "Hello world?",
                html: `please verify your mail with this OTP ${token}`,
            };

            const sendMail = async (transporter, mailOptions) => {
                try {
                    await transporter.sendMail(mailOptions);
                    console.log('email has been sent');
                } catch (error) {
                    console.log(error);
                }
            };

            sendMail(transporter, mailOptions);
        }

        const otpmail = {
            email: req.body.email,
            otp: token
        };

        await collectionotp.insertMany(otpmail);
    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const postresendotp = async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.usern,
                pass: process.env.PASSWORD
            },
        });

        const token = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

        const mailOptions = {
            from: {
                name: 'frostframe',
                address: process.env.usern
            },
            to: req.session.userData.email,
            subject: "OTP verification✔",
            text: "Hello world?",
            html: `Please verify your mail with this OTP: ${token}`,
        };

        await transporter.sendMail(mailOptions);
        console.log('Email has been sent');

        const otpmail = {
            email: req.session.userData.email,
            otp: token
        };

        await collectionotp.updateOne({ email: req.session.userData.email }, { $set: otpmail }, { upsert: true });
        res.sendStatus(200);
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.sendStatus(500);
    }
};


const getotp = async (req, res) => {
    res.render('user/otp', { errorMessage: req.flash("error") });


};

const postotp = async (req, res) => {
    try {
        const enteredOTP = req.body['otp[]'];
        const enteredOTPStr = enteredOTP.join('');
        if (!enteredOTPStr) {
            req.flash("error", "Enter OTP...!!!! ");
            return res.redirect("/otp");
        }
        if (!req.session.userData) {
            req.flash("error", "No user Found ....  signup for OTP...!!!");
            return res.redirect("/otp");
        }
        const otpdata = await collectionotp.findOne({ email: req.session.userData.email });

        if (!otpdata) {
            req.flash("error", "OTP time OVER..!!! Request Again");
            return res.redirect("/otp");
        }

        if (enteredOTPStr === otpdata.otp) {
            console.log('OTP verified successfully');

            const userData = req.session.userData;
            if (!userData || !userData.password || !userData.email || !userData.name) {
                console.error("Missing required fields in user data");
                return res.status(400).json({ error: "Missing required fields in user data" });
            }

            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash(userData.password, salt);
            userData.password = password;
            await collection.insertMany(userData);
            return res.redirect("/login");
        } else {
            req.flash("error", "OTP is incorrect ");
            return res.redirect("/otp");
        }


    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const getlogin = (req, res) => {

    if (req.session.user) {
        return res.redirect("/")
    }
    res.render('user/login', { errorMessage: req.flash("error") });





};

const postlogin = async (req, res) => {
    try {
        const logindata = {
            email: req.body.email,
            password: req.body.password
        };


        const user = await collection.findOne({ email: logindata.email });

        if (!user) {
            req.flash("error", "USER NOT FOUND");
            return res.redirect("/login");
        }
        if (user.isBlocked) {
            req.flash("error", "USER IS BLOCK");
            return res.redirect("/login");
        }
        const pass = await bcrypt.compare(logindata.password, user.password)
        if (pass) {
            console.log("Hello")
            req.session.user = user._id;
            return res.redirect("/");
        }


        else {
            req.flash("error", "password or email is incorrect");
            return res.redirect("/login");
        }
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const gethomepage = async (req, res) => {
    try {

        const newcategory = await category.find()
        const newProducts = await product.find().sort({ createdAt: -1 });
        const loggedIn = req.session.user;

        const unblockCategory = newcategory.filter(category => !category.isVisible)


        const wishlist = await Wishlist.find({ userId: loggedIn });

        res.render('user/homepage', { unblockCategory: unblockCategory, newProducts: newProducts, loggedIn: loggedIn, wishlist: wishlist });
    } catch (error) {
        console.log(error);
    }

};
const getsunglass = async (req, res) => {
    try {
        const { categoryName } = req.query;
        const page = parseInt(req.query.page) || 1;
        const perPage = 6;
        const skip = (page - 1) * perPage;
        const searchQuery = req.query.query || '';

        let unblockedProducts;
        const regex = new RegExp(searchQuery, 'i');

        if (categoryName) {
            unblockedProducts = await product.find({
                isBlocked: false,
                category: categoryName,
                $or: [
                    { name: { $regex: regex } },
                    { description: { $regex: regex } }
                ]
            }).sort({ updatedAt: -1 }); // Sort by updatedAt descending
        } else {
            unblockedProducts = await product.find({
                isBlocked: false,
                $or: [
                    { name: { $regex: regex } },
                    { description: { $regex: regex } }
                ]
            }).sort({ createdAt: -1 }); // Sort by updatedAt descending
        }

        const totalCount = unblockedProducts.length;
        const totalPages = Math.ceil(totalCount / perPage);

        // Paginate sorted products
        const newProducts = unblockedProducts.slice(skip, skip + perPage);

        const newcategory = await category.find();
        const unblockCategory = newcategory.filter(category => !category.isVisible);
        console.log("hhfhhfhhfhhfhhf", unblockCategory);

        const userid = req.session.user;
        const wishlist = await Wishlist.find({ userId: userid });

        const newProductsWithWishlistStatus = newProducts.map(product => {
            const isInWishlist = wishlist.some(item => item.productId.toString() === product._id.toString());
            return { ...product._doc, isInWishlist };
        });

        res.render('user/sunglass', {
            unblockCategory,
            newProducts: newProductsWithWishlistStatus,
            totalPages,
            currentPage: page,
            searchQuery,
            categoryName,
            wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


const getproduct = async (req, res) => {
    try {

        const id = req.params.id;

        const products = await product.findOne({ _id: id });
        const newcategory = await category.find();


        if (!products) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.render('user/productDetails', { products: products, newcategory: newcategory });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const postlogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);

        }

        res.redirect("/login")
    })
}


const getgoogle = (req, res) => {
    try {
        req.session.user = req.user._id
        res.redirect("/")
    } catch (error) {
        throw error
    }
}
const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        const loggedIn = req.session.user;
        const newcategory = await category.find();
        res.render('user/cart', { newcategory: newcategory, loggedIn: loggedIn, cart: cart, error_messages: req.flash("error") });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).send({ error: "An error occurred" });
    }
};



/ //////////////////////forgett password //////////////

const getforget = async (req, res) => {
    try {

        res.render("user/forget", { errorMessage: req.flash("error") });
    } catch (error) {
        res.send(error.message);
    }
}

const postforget = async (req, res) => {
    try {
        const email = req.body.email;
        const Userdata = await collection.findOne({ email: email });

        if (Userdata) {
            const randomnumber = randomstring.generate();
            const updatedData = await collection.updateOne(
                { email: email },
                { $set: { token: randomnumber } }
            );
            console.log("Update data is coming ", updatedData);

            sendResetPasswordMessage(Userdata.name, Userdata.email, randomnumber);

            req.flash('error', 'Check your email for the reset link.');

            console.log("dfugds");
            res.redirect('/forget');
        } else {
            req.flash('error', 'User not found.');
            res.redirect('/forget');
        }
    } catch (error) {
        res.send(error.message);
    }
}


const sendResetPasswordMessage = async (name, email, token) => {

    try {
       
        const resetLink = `${process.env.DOMAIN_URI}/newpassword?token=${token}`;

        const mailOptions = {
            from: {
                name: 'frostframe',
                address: process.env.usern
            },
            to: email,
            subject: "Forget Password",
            text: "Reset Password",
            html: `
            <p>hai ${name}</p>
            Reset your password <a href="${resetLink}">reset</a>
           `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email has been sent');
    } catch (error) {
        console.error("Error:", error);
    }
};



const getnewpassword = async (req, res) => {

    try {
        const token = req.query.token;

        const tokenData = await collection.findOne({ token: token });
        if (tokenData) {
            res.render('user/newpassword', { user_id: tokenData._id });

        } else {
            res.render('user/newpassword', { message: "Token is invalid.", user_id: null });
        }
    } catch (error) {
        res.send(error);
    }
}


const postnewpassword = async (req, res) => {

    try {
        const password = req.body.newPassword
        console.log(" password", password);
        const user_id = req.body.user_id

        const salt = await bcrypt.genSalt(10)
        const passsword = await bcrypt.hash(password, salt)


        const updatedData = await collection.findByIdAndUpdate({ _id: user_id }, { $set: { password: passsword, token: '' } })
        console.log("updatedData", updatedData); res.redirect("/login")
    } catch (error) {
        res.send(error.message)

    }
}


const getProfile = async (req, res) => {
    try {
        // Assuming the user ID is stored in the session
        const userId = req.session.user;
        const user = await User.findById(userId); // Adjust the model name as per your schema

        if (!user) {
            console.log("User not found");
            return res.status(404).send("User not found");
        }

        const address = await Address.find({ userId: userId });
        const newcategory = await category.find();
        const loggedIn = req.session.user;


        res.render('user/profile', { loggedIn: loggedIn, user: user, address: address, newcategory: newcategory });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send('Server error');
    }
};

const postupdateProfile = async (req, res) => {
    try {
        console.log("Updating profile");
        const userId = req.session.user; // Assuming the user ID is stored in the session
        const { name, phone } = req.body; // Exclude email from destructuring

        // Find the existing user to get the current email
        const existingUser = await User.findById(userId);

        if (!existingUser) {
            return res.send("User not found");
        }

        // Update the existing user with new data, excluding email
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, phone }, // Only update name and phone
            { new: true, runValidators: true }
        );

        // Redirect to profile page with updated user information
        res.redirect('/profile');
    } catch (error) {
        console.error(error.message);
        res.status(500).send(error.message);
    }
};


const getaddress = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await Order.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages


        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find()
        const address = await Address.find({ userId: userId }).skip(skip).limit(perPage).sort({ createdAt: -1 })
        const loggedIn = req.session.user;


        res.render("user/address", { newcategory: newcategory, address: address, user: user, loggedIn: loggedIn, currentPage: parseInt(page),totalPages})
    } catch (error) {
        throw error

    }
}


const addAddress = async (req, res) => {

    console.log("addAddress route triggered");

    try {
        // console.log("Request body:", req.body);
        const userId = req.session.user;



        const { name, address, phone, locality, pincode, state } = req.body;

        console.log("Parsed data:", { name, address, phone, locality, pincode, state });


        const newAddress = new Address({ userId, name, address, phone, locality, pincode, state });
        await newAddress.save();

        res.status(201).send({ message: 'Address added successfully' });
    } catch (error) {
        console.error("Error saving address:", error);
        res.status(500).send({ message: 'Failed to add address', error });
    }

}



const updateAddress = async (req, res) => {
    console.log("updateAddress route triggered");

    try {
        const addressId = req.params.id;
        console.log("Address ID:", addressId);

        const { name, address, phone, locality, pincode, state } = req.body;

        console.log("Updated data:", { name, address, phone, locality, pincode, state });

        // Find the address by ID and update its fields
        const updatedAddress = await Address.findByIdAndUpdate(addressId, {
            name,
            address,
            phone,
            locality,
            pincode,
            state
        }, { new: true });

        if (!updatedAddress) {
            return res.status(404).send({ message: "Address not found" });
        }

        res.status(200).send({ message: "Address updated successfully" });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).send({ message: "Failed to update address", error });
    }
};


const deleteAddress = async (req, res) => {
    try {
        // Extract address ID from request parameters
        const { id } = req.params;

        // Find the address by ID and delete it
        await Address.findByIdAndDelete(id);


        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        // Handle error
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Failed to delete address', error });
    }
};


const addProductCart = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.session.user;
        const quantity = req.body.quantity || 1; // Use the quantity from the request body, default to 1 if not provided

        const Product = await product.findOne({ _id: id });
        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: []
            });
        }

        // Check if the product is already in the cart
        const existingItemIndex = cart.items.findIndex(item => item.productId.equals(Product._id));
        if (existingItemIndex !== -1) {
            // If the product already exists in the cart, update its quantity
            cart.items[existingItemIndex].quantity += parseInt(quantity, 10);
        } else {
            // If the product is not in the cart, add it
            cart.items.push({
                productId: Product._id,
                quantity: parseInt(quantity, 10)
            });
        }

        // Save the updated cart to the database
        await cart.save();


        res.redirect("/cart");
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send({ error: "An error occurred" });
    }
};


const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user; // Assuming user ID is stored in session
        const { id } = req.params; // Product ID
        const { quantity } = req.body; // Extract quantity from the request body

        // Find the cart by user ID
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).send({ error: "Cart not found" });
        }

        // Find the item in the cart
        const item = cart.items.find(item => item.productId.toString() === id);
        if (!item) {
            return res.status(404).send({ error: "Product not found in cart" });
        }

        // Update the quantity
        item.quantity = quantity;

        // Save the updated cart
        await cart.save();

        console.log("Updated Cart Item:", item.quantity);
        res.status(200).send({ success: true, cart });
    } catch (error) {
        console.error("Error updating product quantity in cart:", error);
        res.status(500).send({ error: "An error occurred" });
    }
}


const cartRemove = async (req, res) => {
    try {

        const { id } = req.params;

        const userId = req.session.user; // Assuming you have userId in req.user
        // Update the cart for the user to remove the item
        const updatedCart = await Cart.findOneAndUpdate(
            { userId: userId },
            { $pull: { "items": { productId: id } } }, // Remove item with productId equal to id
            { new: true } // Return the updated cart after the operation
        );
        console.log(updatedCart);
        console.log(id)
        res.status(200).json({ message: "Success" })

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "sorry we are working on a solution." })

    }
}

const getcheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        const items = cart.items;

        const allCategories = await category.find();
        const visibleCategoryIds = allCategories.filter(cat => cat.isVisible).map(cat => cat._id.toString());
       

        // Check if any item quantity in the cart is greater than the available stock
        for (const item of items) {
            if (item.quantity > item.productId.stock) {
                req.flash('error', `Not enough stock for product: ${item.productId.name}`);
                return res.redirect("/cart");
            }
            console.log(visibleCategoryIds);

            // // Check if the product's category is blocked
            // if (visibleCategoryIds.includes(item.productId.category)) {
            //     req.flash('error', `Product not available now: ${item.productId.name}`);
            //     return res.redirect("/cart");
            // }
        }

        const loggedIn = req.session.user;
        const newcategory = await category.find();
        const address = await Address.find({ userId: userId });
        const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

        const coupons = await Coupon.find();


        res.render("user/checkout", {
            coupons,
            loggedIn,
            newcategory,
            address,
            cart,
            totalQuantity,
            error_messages: req.flash("error")
        });
    } catch (error) {
        console.error('Error in getcheckout:', error);
        res.status(500).send('Internal Server Error');
    }
};


const postcheckout = async (req, res) => {
    try {

        const userId = req.session.user;
        const { payment: paymentMethod, orderId, address: userAddress } = req.body;
        const add = await Address.findOne({ _id: userAddress });



        const addressObj = {
            name: add.name,
            address: add.address,
            pincode: add.pincode,
            locality: add.locality,
            state: add.state,
            phoneNo: add.phoneNo || '',
            city: add.city || '',
            user: userId
        };


        // Validate required fields
        if (!addressObj.name || !addressObj.address || !addressObj.pincode || !addressObj.locality || !addressObj.state) {
            return res.status(404).send('address not found');
        }

        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        const items = cart.items.map(item => {
            const { productId } = item;
            const category = productId.category || {};

            return {
                productId: productId._id,
                productName: productId.name || 'Unknown',
                productDescription: productId.description || '',
                categoryId: category._id,
                categoryName: category.name || 'Unknown',
                stock: productId.stock || 0,
                productImage: productId.productImages || [],
                quantity: item.quantity,
                price: isNaN(productId.price) ? 0 : Math.round((productId.price + Number.EPSILON) * 100) / 100,
                discountPrice: isNaN(productId.discountPrice) ? 0 : Math.round((productId.discountPrice + Number.EPSILON) * 100) / 100
            };
        });

        const totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
        const totalPrice = Math.round((cart.items.reduce((total, item) => {
            if (item.productId.discountPrice) {
                return total + (isNaN(item.productId.discountPrice) ? 0 : item.productId.discountPrice) * item.quantity;
            } else {
                return total + (isNaN(item.productId.price) ? 0 : item.productId.price) * item.quantity;
            }
        }, 0) + Number.EPSILON) * 100) / 100;


        console.log("totalPrice", totalPrice);
        if (totalPrice < 1000) {

            req.flash('error', `lessthan 1000 not allowed in cod`);
            return res.redirect("/checkout");
        } else {
            const order = new Order({
                orderId: orderId,
                userId: userId,
                items: items,
                totalQuantity: totalQuantity,
                totalPrice: totalPrice,
                address: addressObj,
                paymentMethod: paymentMethod === 'cod' ? "cashOnDelivery" : "razorpay"
            });

            await order.save();
        }



        for (let item of cart.items) {
            const productId = item.productId._id;
            const quantity = item.quantity;

            const productUpdateResult = await product.findByIdAndUpdate(productId, {
                $inc: { stock: -quantity }
            });

            if (!productUpdateResult) {
                throw new Error(`Failed to update stock for product ID: ${productId}`);
            }
        }



        await Cart.updateOne({ userId: userId }, { $set: { items: [] } });

        const user = await User.findOne({ _id: userId });
        const rf = user.referredCode;
        const userOrders = await Order.find({ userId: userId });
        const referUser = await User.findOne({ referralCode: rf });

        if (userOrders.length <= 1 && referUser) {
            referUser.wallet.balance += 100;
            await referUser.save();
            console.log("100 Rs added to the wallet.balance of the referring user.");
        }

        console.log("form submitting");
        res.render("user/success");
    } catch (error) {
        console.error("Error in checkout:", error);
        res.status(500).send('Internal server error');
    }
};


const getsuccess = (req, res) => {
    try {
        res.render("user/success")

    } catch (error) {
        throw error

    }
}


const getorder = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await Order.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages



        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const orders = await Order.find({ userId }).skip(skip).limit(perPage).sort({ createdAt: -1 });


        res.render("user/order", { newcategory, loggedIn, user, orders, totalPages, currentPage: parseInt(page) });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};


const getorderdetails = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.session.user;
        const loggedIn = req.session.user;
        const ordera = await Order.findById(id);

        // Fetch a specific order by ID
        const order = await Order.findById(id).populate('items.productId');
        if (!order) {
            return res.status(404).send("Order not found");
        }

        const newcategory = await category.find();
        res.render("user/orderdetails", { loggedIn, newcategory, order });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};


const cancelOrder = async (req, res) => {
    const { orderId, productId } = req.params;
    const reason = req.body.reason;
    console.log("reason", reason);

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Find the item within the order by product ID
        const itemIndex = order.items.findIndex(item => item.productId == productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in the order.' });
        }

        const item = order.items[itemIndex];


        // Modify the item's status
        item.status = 'Cancelled';

        order.reason = reason;

        const userid = order.userId

        const user = await User.findById(userid)

        console.log("user.wallet.balance", user.wallet.balance)

        if (order.paymentMethod === "Razorpay") {
            // Add the order total price to the user's wallet balance
            user.wallet.balance += order.totalPrice;

            // Create a new transaction object
            const newTransaction = {
                amount: order.totalPrice,
                description: `Cancelled order amount added to wallet for Order ID: ${order._id}`,
                date: new Date()
            };

            // Push the new transaction to the user's wallet transactions
            user.wallet.transactions.push(newTransaction);

            // Save the updated user document
            await user.save();
        }




        // Find the product by ID
        const Product = await product.findById(productId);
        if (!Product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Update the product stock
        Product.stock += item.quantity;

        // Save the updated product
        await Product.save();

        // Save the updated order
        await order.save();

        res.status(200).json({ success: true, message: 'Item cancelled and stock updated successfully.' });
    } catch (error) {
        console.error('Error cancelling item:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


const changepassword = async (req, res) => {
    try {

        const userId = req.session.user;
        const user = await User.findById(userId); // Adjust the model name as per your schema

        const newcategory = await category.find();
        const loggedIn = req.session.user;
        res.render("user/changepassword", { user: user, loggedIn: loggedIn, newcategory: newcategory,errorMessage: req.flash("error")})
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });

    }
}


const postchangepassword = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Ensure new password and confirm new password match
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    try {

        // Find the user by ID (assuming you have user ID from session or JWT token)
        const userId = req.session.user;
        const user = await User.findById(userId);

        // Check if user exists
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if(newPassword[0] == " "){
          
            req.flash('error', 'Check your email for the reset link.');

            
        }

        // Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {

            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
     
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password in the database
        user.password = hashedPassword;
        await user.save();

        res.redirect("/changepassword")
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

const getwishlist = async (req, res) => {

    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await Wishlist.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages


        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const orders = await Order.find({ userId });
        const wishlist = await Wishlist.find({ userId: userId }).skip(skip).limit(perPage).sort({ createdAt: -1 })


        res.render("user/wishlist", { newcategory, loggedIn, user, orders, wishlist, totalPages, currentPage: parseInt(page) });
    } catch (error) {


    }

}


const postaddtowishlist = async (req, res) => {
    try {
        console.log("fetch reached");
        const { productId } = req.body; // Extract productId from request body

        console.log(productId);

        // Ensure productId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid productId' });
        }

        const userid = req.session.user;
        const wishlist = await Wishlist.find({ userId: userid });

        // Find the index of the item to remove
        const existingWishlist = await Wishlist.findOneAndDelete({ userId: userid, productId: productId });
        if (existingWishlist) {
            return res.status(200).json({ success: true, message: 'Product removed from wishlist' });
        }

        // Find the product by its ID
        const Product = await product.findById(productId);

        // Check if the product exists
        if (!Product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Extract product details
        const { name: productName, productImages, price } = Product;

        console.log("images", productImages);

        // Create a new wishlist item
        const wishlistItem = new Wishlist({
            userId: req.session.user,
            productId: Product._id,
            productName: productName,
            productImage: productImages, // Ensure that this matches your schema
            price: price,
            addedAt: new Date()
        });

        // Save the wishlist item to the database
        const savedItem = await wishlistItem.save();

        // Send success response
        res.status(201).json({ success: true, message: 'Product added to wishlist', item: savedItem });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


const getwallet = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 5; // Number of transactions per page
        const skip = (page - 1) * perPage;

        const userId = req.session.user;
        const user = await User.findById(userId).populate({
            path: 'wallet.transactions',
            options: {
                skip: skip,
                limit: perPage,
                sort: { date: -1 }
            }
        });

        const totalCount = user.wallet.transactions.length;
        const totalPages = Math.ceil(totalCount / perPage);
        const newCategory = await category.find();
        const loggedIn = req.session.user;

        res.render('user/wallet', { newCategory, loggedIn, user, totalPages, currentPage: page });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


const postrazorpay = async (req, res) => {
    try {

        const { amount, currency, coupon, orderId, address } = req.body;


        let discount = 0;
        let finalAmount = amount;


        // Validate and fetch coupon details
        if (coupon) {
            // Fetch the coupon details from the database
            const couponDetails = await Coupon.findOne({ _id: coupon, isActive: true });

            if (couponDetails) {
                const currentDate = new Date();

                if (couponDetails.expirationDate >= currentDate) {
                    discount = couponDetails.discountValue;
                    console.log(`Coupon applied. Discount: ${discount}`);
                    finalAmount = amount - amount * discount / 100;
                    console.log("finalAmount", finalAmount);
                } else {
                    console.log('Coupon has expired');
                }
            } else {
                console.log('Invalid or inactive coupon');
            }
        }


        const razorpay = new Razorpay({
            key_id: "rzp_test_KOCURsj88Mu4Sj",
            key_secret: "64CY4QIGucP0t33gP8JodsqI"
        });

        const options = {
            amount: finalAmount * 100, // amount in the smallest currency unit
            currency: currency,
            receipt: `order_rcptid_11`
        };

        const order = await razorpay.orders.create(options);
        console.log("Razorpay order:", order.amount);


        res.status(200).json({
            success: true,
            key: 'rzp_test_KOCURsj88Mu4Sj',
            amount: order.amount,
            currency: order.currency,
            name: "Your Company Name",
            description: "Payment for Order #12345",
            order_id: order.id,
            prefill: {
                name: "Customer Name",
                email: "customer@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#F37254"
            }
        });
    } catch (error) {

        if (error.error && error.error.description) {
            res.status(500).json({ success: false, message: error.error.description });
        } else {
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    }
};


async function getCouponDetails(couponCode) {
    // Replace this with actual database call
    const coupons = {
        'DISCOUNT10': { discount: 10, isActive: true },
        'DISCOUNT20': { discount: 20, isActive: true },
        // Add more coupons as needed
    };

    return coupons[couponCode] || null;
}


const getcoupon = async (req, res) => {

    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await Coupon.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages


        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const coupons = await Coupon.find().skip(skip).limit(perPage).sort({ createdAt: -1 })
        res.render('user/coupon', { coupons, newcategory, loggedIn, user, totalPages, currentPage: parseInt(page) })
    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


const getvalidateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ code: req.params.id });
        const grandtotal = parseFloat(req.query.total);

        if (coupon) {
            // Coupon found

            const currentDate = new Date();
            const expirationDate = new Date(coupon.expirationDate);
            const minimum = coupon.minimum;
            const maximum = coupon.maximum;
            const fixedRate = coupon.fixedRate;

            if (!coupon.isActive) {
                res.json({
                    valid: false,
                    message: "Coupon is not active."
                });
            } else if (expirationDate < currentDate) {
                res.json({
                    valid: false,
                    message: "Coupon has expired."
                });
            } else if (grandtotal < minimum) {
                res.json({
                    valid: false,
                    message: `This Coupon is only applicable for orders above ${minimum}.`
                });
            } else if (grandtotal > maximum) {
                // Apply fixed rate discount if grandtotal exceeds maximum
                res.json({
                    valid: true,
                    discount: fixedRate,
                    couponid: coupon._id,
                    fixed: true
                });
            } else {
                res.json({
                    valid: true,
                    discount: coupon.discountValue,
                    couponid: coupon._id,
                    fixed: false
                });
            }
        } else {
            // Coupon not found
            res.json({
                valid: false,
                message: "Invalid coupon code."
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


const postrazorpaysuccess = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, address } = req.body;
        const userId = req.session.user; // Assuming userId is correctly set in session
        const add = await Address.findOne({ _id: address });


        const addressObj = {
            name: add.name,
            address: add.address,
            pincode: add.pincode,
            locality: add.locality,
            state: add.state,
            phoneNo: add.phoneNo || '',
            city: add.city || '',
            user: userId
        };
        console.log("addressObj", addressObj);

        // Retrieve the cart for the user
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        // Ensure user details are available
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        // Prepare items array for the order
        const items = cart.items.map(item => {
            const { productId } = item;
            const category = productId.category || {};

            return {
                productId: productId._id,
                productName: productId.name || 'Unknown',
                productDescription: productId.description || '',
                categoryId: category._id,
                categoryName: category.name || 'Unknown',
                stock: productId.stock || 0,
                productImage: productId.productImages || [],
                quantity: item.quantity,
                price: isNaN(productId.price) ? 0 : Math.round((productId.price + Number.EPSILON) * 100) / 100,
                discountPrice: isNaN(productId.discountPrice) ? 0 : Math.round((productId.discountPrice + Number.EPSILON) * 100) / 100
            };
        });

        // Calculate total quantity and total price
        const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
        const totalPrice = Math.round((cart.items.reduce((total, item) => {
            if (item.productId.discountPrice) {
                return total + (isNaN(item.productId.discountPrice) ? 0 : item.productId.discountPrice) * item.quantity;
            } else {
                return total + (isNaN(item.productId.price) ? 0 : item.productId.price) * item.quantity;
            }
        }, 0) + Number.EPSILON) * 100) / 100;
        console.log("totalPrice", totalPrice);
        console.log(typeof (totalPrice));
        // Create the order
        const order = new Order({
            orderId: razorpay_order_id,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            address: addressObj,
            items: items,
            totalQuantity: totalQuantity,
            totalPrice: totalPrice,
            status: 'paid',
            paymentMethod: 'Razorpay',
            paymentId: razorpay_payment_id,
            paymentSignature: razorpay_signature
        });
        console.log("orderkkllkkll", order);

        await order.save();


        for (let item of cart.items) {
            const productId = item.productId._id;
            const quantity = item.quantity;
            console.log("    const productId = item.productId._id;", item.productId._id);
            console.log(" const quantity = item.quantity;", item.quantity);

            const productUpdateResult = await product.findByIdAndUpdate(productId, {
                $inc: { stock: -quantity }
            });

            if (!productUpdateResult) {
                throw new Error(`Failed to update stock for product ID: ${productId}`);
            }
        }

        // Clear the cart after successful order creation
        await Cart.updateOne({ userId: user._id }, { $set: { items: [] } });

        // Handle referral rewards if applicable
        const rf = user.referredCode;
        const userOrders = await Order.find({ userId: user._id });
        const referUser = await User.findOne({ referralCode: rf });

        if (userOrders.length === 1 && referUser) {
            referUser.wallet.balance += 100;
            await referUser.save();
            console.log("100 Rs added to the wallet.balance of the referring user.");
        }

        res.status(200).json({ success: true, id: order._id, message: 'Payment successful.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


const getinvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId; // Get the order ID from the URL parameter
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        // Add Invoice header
        doc.fontSize(25).text('Invoice', { align: 'center' });

        // Add Seller details
        doc.fontSize(12).text('Seller:', 80, 100);
        doc.text('FROSTFRAME', 150, 100);
        doc.text('TRIVANDRUM', 150, 120);
        doc.text('FostFrame,Kerala,thiruvananthapuram', 150, 140);

        // Add Customer details
        const { address } = order;

        doc.text('Customer:   ', 80, 200);
        doc.text(address.name, 150, 200);
        doc.text(address.address, 150, 220);
        doc.text(`${address.city}, ${address.state}, ${address.pincode}`, 150, 240);

        // Add Product details
        doc.text('Product Description', 100, 300);
        doc.text('Quantity', 300, 300);
        doc.text('Price', 400, 300);

        let yPosition = 320;
        order.items.forEach(item => {
            doc.text(item.productName, 100, yPosition);
            doc.text(item.quantity, 300, yPosition);
            doc.text(item.price, 400, yPosition);
            yPosition += 20;
        });

        // Add total
        doc.text('Total', 100, yPosition);
        doc.text(order.totalPrice, 400, yPosition);

        // Finalize the PDF and end the stream
        doc.end();

    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

const postreturn = async (req, res) => {
    console.log("req.body", req.body);
    const { orderId, productId, reason } = req.body;

    try {



        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the product in the order items
        const item = order.items.find(item => item.productId.toString() === productId);
        console.log("item", item);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        // Update the product stock
        const Product = await product.findById(productId);
        if (Product) {
            Product.stock += item.quantity;
            await Product.save();
        }

        const userid = req.session.user;
        const user = await User.findById(userid)

        if (order.paymentMethod === "Razorpay") {
            // Add the order total price to the user's wallet balance
            user.wallet.balance += order.totalPrice;

            // Create a new transaction object
            const newTransaction = {
                amount: order.totalPrice,
                description: `Return order amount added to wallet for Order ID: ${order._id}`,
                date: new Date()
            };

            // Push the new transaction to the user's wallet transactions
            user.wallet.transactions.push(newTransaction);

            // Save the updated user document
            await user.save();
        }


        // Update the item status to 'Returned' and set a reason if necessary
        item.status = 'Returned';
        item.reason = req.body.reason || '';  // Optional: reason for return
        order.reason = reason;
        await order.save();

        res.json({ success: true, message: 'Item returned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const postrazorpayfail = async (req, res) => {
    try {
        console.log("Payment failed data:", req.body);

        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_error,
            address,
            coupon,
            paymentMethod = 'razorpay',
        } = req.body;
        let id = req.session.user

        console.log("ooppooppoopp", coupon);

        // Retrieve the user's cart to get items details
        const cart = await Cart.findOne({ userId: id }).populate('items.productId');

        const add = await Address.findOne({ _id: address });


        const addressObj = {
            name: add.name,
            address: add.address,
            pincode: add.pincode,
            locality: add.locality,
            state: add.state,
            phoneNo: add.phoneNo || '',
            city: add.city || '',
            user: id
        };

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        // Prepare items array for the failed order
        const items = cart.items.map(item => {
            const { productId } = item;
            const category = productId.category || {};


            return {
                productId: productId._id,
                productName: productId.name || 'Unknown',
                productDescription: productId.description || '',
                categoryId: category._id,
                categoryName: category.name || 'Unknown',
                stock: productId.stock || 0,
                productImage: productId.productImages || [],
                quantity: item.quantity,
                price: isNaN(productId.price) ? 0 : Math.round((productId.price + Number.EPSILON) * 100) / 100,
                discountPrice: isNaN(productId.discountPrice) ? 0 : Math.round((productId.discountPrice + Number.EPSILON) * 100) / 100
            };
        });

        const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
        const totalPrice = Math.round((cart.items.reduce((total, item) => {
            if (item.productId.discountPrice) {
                return total + (isNaN(item.productId.discountPrice) ? 0 : item.productId.discountPrice) * item.quantity;
            } else {
                return total + (isNaN(item.productId.price) ? 0 : item.productId.price) * item.quantity;
            }
        }, 0) + Number.EPSILON) * 100) / 100;

        // Construct the failed order document
        const failedOrder = new Order({
            orderId: razorpay_order_id,
            userId: id,
            items: items,
            totalQuantity: totalQuantity,
            totalPrice: totalPrice+15,
            address: addressObj,
            paymentMethod,
            reason: req.body.razorpay_error.reason,
            coupon: {
                couponCode: coupon,
                discount: 0 // Assuming no discount for failed orders
            },
            status: 'Payment Pending' // Setting the status to 'Payment Pending' for failed orders
        });



        // Save the failed order to the collection
        await failedOrder.save();

        for (let item of cart.items) {
            const productId = item.productId._id;
            const quantity = item.quantity;
            console.log("    const productId = item.productId._id;", item.productId._id);
            console.log(" const quantity = item.quantity;", item.quantity);

            const productUpdateResult = await product.findByIdAndUpdate(productId, {
                $inc: { stock: -quantity }
            });

            if (!productUpdateResult) {
                throw new Error(`Failed to update stock for product ID: ${productId}`);
            }
        }

        // Clear the cart after successful order creation
        await Cart.updateOne({ userId: id }, { $set: { items: [] } });
        console.log(cart);

        // Handle referral rewards if applicable
        const rf = user.referredCode;
        const userOrders = await Order.find({ userId: user._id });
        const referUser = await User.findOne({ referralCode: rf });

        if (userOrders.length === 1 && referUser) {
            referUser.wallet.balance += 100;
            await referUser.save();
            console.log("100 Rs added to the wallet.balance of the referring user.");
        }


        res.status(200).json({ message: 'Failed order saved successfully.' });
    } catch (error) {
        console.log('Error saving failed order:', error);
        res.status(500).json({ message: 'Error saving failed order.' });
    }
};

const razorpayretrysuccess = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;


    try {
        await Order.updateOne({ _id: orderId }, { $set: { reason: 'Paid', paymentId: razorpay_payment_id } });


        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error updating order status', error: error.message });
    }
};

module.exports = {
    getsignup,
    postsignup,
    postotp,
    getotp,
    getlogin,
    postlogin,
    gethomepage,
    getsunglass,
    getproduct,
    postlogout,
    getgoogle,
    getCart,
    getforget,
    postforget,
    getnewpassword,
    postnewpassword,
    getProfile,
    postupdateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    getaddress,
    addProductCart,
    cartRemove,
    getcheckout,
    getsuccess,
    postcheckout,
    postresendotp,
    getorder,
    getorderdetails,
    cancelOrder,
    changepassword,
    postchangepassword,
    updateQuantity,
    getwishlist,
    postaddtowishlist,
    getwallet,
    postrazorpay,
    getcoupon,
    getvalidateCoupon,
    postrazorpaysuccess,
    getinvoice,
    postreturn,
    postrazorpayfail,
    razorpayretrysuccess
};


















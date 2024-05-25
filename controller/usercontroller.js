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
            console.log("referral", referral);
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
            wallet: walletamount,
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
        console.log("resend");
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
            html: `please verify your mail with this OTP   ${token}`,
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

        const otpmail = {
            email: req.body.email,
            otp: token

        }
        await collectionotp.insertMany(otpmail)
    } catch (error) {
        throw error
    }
}

const getotp = async (req, res) => {
    res.render('user/otp', { errorMessage: req.flash("error") });


};

const postotp = async (req, res) => {
    try {
        console.log(req.body)
        const enteredOTP = req.body['otp[]'];
        const enteredOTPStr = enteredOTP.join('');






        console.log('Entered OTP:', enteredOTPStr);
        // console.log(req.session.userData.email);



        const otpdata = await collectionotp.findOne({ email: req.session.userData.email })


        if (enteredOTPStr === otpdata.otp) {
            console.log('OTP verified successfully');

            const userData = req.session.userData;
            if (!userData || !userData.password || !userData.email || !userData.name) {
                console.error("Missing required fields in user data");
                return res.status(400).json({ error: "Missing required fields in user data" });
            }
            const salt = await bcrypt.genSalt(10)
            const password = await bcrypt.hash(userData.password, salt)
            userData.password = password
            await collection.insertMany(userData);
            return res.redirect("/login");
        } else {
            req.flash("error", "otp is incorrect");
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
        const newProducts = await product.find();
        const loggedIn = req.session.user;

        const unblockCategory = newcategory.filter(category => !category.isVisible)

        res.render('user/homepage', { newcategory: unblockCategory, newProducts: newProducts, loggedIn: loggedIn });
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
                isBlocked: false, category: categoryName,
                $or: [
                    { name: { $regex: regex } },
                    { description: { $regex: regex } }
                ],
            });
        } else {
            unblockedProducts = await product.find({
                isBlocked: false,
                name: { $regex: regex },
            });
        }

        const totalCount = unblockedProducts.length;
        const totalPages = Math.ceil(totalCount / perPage);

        const newProducts = unblockedProducts.slice(skip, skip + perPage);

        const newcategory = await category.find()
        const unblockCategory = newcategory.filter(category => !category.isVisible)

        const userid = req.session.user;
        const wishlist = await Wishlist.find({ userId: userid });

        const newProductsWithWishlistStatus = newProducts.map(product => {
            const isInWishlist = wishlist.some(item => item.productId.toString() === product._id.toString());
            return { ...product._doc, isInWishlist };
        });

        res.render('user/sunglass', { unblockCategory, newProducts: newProductsWithWishlistStatus, totalPages, currentPage: page, searchQuery, categoryName, wishlist });
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
        res.render('user/cart', { newcategory: newcategory, loggedIn: loggedIn, cart: cart });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).send({ error: "An error occurred" });
    }
};


/ //////////////////////forgett password //////////////

const getforget = async (req, res) => {
    console.log("getting forget");
    try {
        res.render("user/forget")
    } catch (error) {
        res.send(error)

    }
}


const postforget = async (req, res) => {
    try {
        const email = req.body.email;
        const Userdata = await collection.findOne({ email: email })
        if (Userdata) {

            const randomnumber = randomstring.generate()
            const updatedData = await collection.updateOne({ email: email }, { $set: { token: randomnumber } })
            console.log("update data is coming ", updatedData)
            sendResetPasswordMessage(Userdata.name, Userdata.email, randomnumber)
            res.render("user/forget", { message: "check your email" })
            console.log("entered");

        } else {
            res.render("user/forget", { message: "user not found " })

        }
    } catch (error) {
        res.send(error.message)

    }
}


const sendResetPasswordMessage = async (name, email, token) => {

    try {
        console.log(process.env.usern)
        const resetLink = `http://localhost:3000/newpassword?token=${token}`;

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

        console.log("Rendering profile page with user:", user);

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
        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find()
        const address = await Address.find({ userId: userId })
        const loggedIn = req.session.user;


        res.render("user/address", { newcategory: newcategory, address: address, user: user, loggedIn: loggedIn })
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
        const item = cart.items
        if (item.length == 0) {

            return res.redirect("/cart")

        }
        const loggedIn = req.session.user;
        const newcategory = await category.find();

        const address = await Address.find({ userId: userId });

        // If cart is found, map over the items to calculate total quantity
        const totalQuantity = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

        const coupons = await Coupon.find()


        res.render("user/checkout", { coupons, loggedIn, newcategory, address, cart: cart || { items: [] }, totalQuantity });
    } catch (error) {
        console.error('Error in getcheckout:', error);
        res.status(500).send('Internal Server Error');
    }
};


const postcheckout = async (req, res) => {
    try {
        console.log("post checkout", req.body);
        const userId = req.session.user;
        const { payment: paymentMethod, orderId, address: userAddress } = req.body;
        const addressParts = userAddress.split(",");
        const addressObj = {
            name: addressParts[0],
            address: addressParts[1],
            pincode: addressParts[2],
            locality: addressParts[3],
            state: addressParts[4],
            phoneNo: '', // Add the phone number if available
            city: '', // Add the city if available
            user: userId
        };

        if (!addressObj.name || !addressObj.address || !addressObj.pincode || !addressObj.locality || !addressObj.state) {
            return res.status(400).send('Missing required address fields');
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
            referUser.wallet += 100; 
            await referUser.save(); 
            console.log("100 Rs added to the wallet of the referring user.");
        }
      console.log("form submtting");
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
        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const orders = await Order.find({ userId });


        res.render("user/order", { newcategory, loggedIn, user, orders });
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
        res.render("user/changepassword", { user: user, loggedIn: loggedIn, newcategory: newcategory })
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
        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const orders = await Order.find({ userId });
        const wishlist = await Wishlist.find({ userId: userId })


        res.render("user/wishlist", { newcategory, loggedIn, user, orders, wishlist });
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
        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        res.render('user/wallet', { newcategory, loggedIn, user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

const postrazorpay = async (req, res) => {
    console.log("Entering Razorpay handler");
    try {
        console.log("Razorpay request body:", req.body);

        const { amount, currency } = req.body;

        const razorpay = new Razorpay({
            key_id: "rzp_test_KOCURsj88Mu4Sj",
            key_secret: "64CY4QIGucP0t33gP8JodsqI"
        });

        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: currency,
            receipt: `order_rcptid_11`
        };

        const order = await razorpay.orders.create(options);
        console.log("Razorpay order:", order);

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
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getcoupon = async (req, res) => {

    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const newcategory = await category.find();
        const loggedIn = req.session.user;
        const coupons = await Coupon.find()
        res.render('user/coupon', { coupons, newcategory, loggedIn, user })
    } catch (error) {

        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


const getvalidateCoupon = async (req, res) => {

    try {

        const coupon = await Coupon.findOne({ code: req.params.id });

        if (coupon) {
            // Coupon found

            const currentDate = new Date();
            const expirationDate = new Date(coupon.expirationDate);

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
            } else {
                res.json({
                    valid: true,
                    discount: coupon.discountValue
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
    console.log("success controller", req.body.user_name);
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id, user_id, user_name, user_email, address, items } = req.body;

        // Verify the Razorpay signature (optional but recommended)
        const crypto = require('crypto');
        const secret = '64CY4QIGucP0t33gP8JodsqI';
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        console.log("expectedSignature", expectedSignature);
        console.log("razorpay_signature", razorpay_signature);

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature.' });
        }

        // Create a new order with the received details
        const order = new Order({
            orderId: order_id,
            userId: user_id,
            userName: user_name,
            userEmail: user_email,
            address: address,
            items: items,
            status: 'paid'
        });

        await order.save();

        // Clear the cart
        await Cart.updateOne({ userId: user_id }, { $set: { items: [] } });

        // Optionally, handle referral rewards
        const user = await User.findById(user_id);
        const rf = user.referredCode;
        const userOrders = await Order.find({ userId: user_id });
        const referUser = await User.findOne({ referralCode: rf });

        if (userOrders.length <= 1 && referUser) {
            referUser.wallet += 100; 
            await referUser.save(); 
            console.log("100 Rs added to the wallet of the referring user.");
        }

        res.status(200).json({ success: true, id: order._id, message: 'Payment successful.' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
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
    postrazorpaysuccess
};


















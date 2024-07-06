const express = require("express")
const multer = require('multer');
const router = express.Router()
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const ExcelJS = require('exceljs');
const moment = require("moment-timezone")

const collection = require('../model/user')
const category = require("../model/category")
const product = require("../model/product")
const Order = require('../model/order');
const Coupon = require('../model/coupon');







const getlogin = (req, res) => {

    res.render('admin/login', { errorMessage: req.flash("error") })





}

const postlogin = async (req, res) => {
    try {
        const { password, email } = req.body;

        // Validate the email and password
        if (process.env.ADMINPASS === password && process.env.ADMINMAIL === email) {
            console.log("Email and password were correct.");
            req.session.admin = email;




            return res.render("admin/dashbord"); // Corrected dashboard spelling
        } else {
            req.flash("error", "Email or password is incorrect");
            console.log("Email or password was incorrect.");
            return res.redirect("/admin");

        }
    } catch (error) {
        console.error("Error during login:", error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin");
    }
}


const getdashbord = async (req, res) => {

    try {
        // Fetch orders from the database
        const orders = await Order.find();

        // Process data for the charts
        const salesData = {
            labels: moment.months(), // ['January', 'February', 'March', ...]
            data: Array(12).fill(0)
        };

        const productsData = {};
        const categoriesData = {};

        for (const order of orders) {
            const orderMonth = moment(order.orderDate).month();
            salesData.data[orderMonth] += order.totalPrice;

            // Process each item in the order
            for (const item of order.items) {
                try {
                    // Find the product using productId to get categoryName
                    const Product = await product.findById(item.productId);
                    if (Product) {
                        // Process products data
                        if (!productsData[item.productName]) {
                            productsData[item.productName] = 0;
                        }
                        productsData[item.productName] += item.quantity;

                        // Process categories data
                        const category = Product.category;
                        if (!categoriesData[category]) {
                            categoriesData[category] = 0;
                        }
                        categoriesData[category] += item.quantity;
                    } else {
                        console.log(`Product with ID ${item.productId} not found.`);
                    }
                } catch (error) {
                    console.error(`Error fetching product with ID ${item.productId}: ${error.message}`);
                }
            }
        }
        const productsChartData = {
            labels: Object.keys(productsData),
            data: Object.values(productsData)
        };
        console.log("productsChartData",productsChartData);
    


        const categoriesChartData = {
            labels: Object.keys(categoriesData),
            data: Object.values(categoriesData)
        };

        console.log("categoriesChartData",categoriesChartData);

        // Send data to the EJS template
        res.render('admin/dashbord', {
            salesData,
            productsChartData,
            categoriesChartData
        });
    }  catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
   }

}


const getusermanagement = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await product.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages



        const userData = await collection.find().skip(skip).limit(perPage).sort({createdAt:-1});
        // console.log("userData is getting",userData);
        res.render('admin/usermanagement', { userData, totalPages, currentPage: parseInt(page) })





    } catch {
        console.error("usermanage is NOT working")
    }


}

const postBlockUser = async (req, res) => {
    try {

        const userId = req.params._id;
        console.log("block is working", userId);
        const userData = await collection.findByIdAndUpdate(userId);
        console.log("userData", userData)

        userData.isBlocked = !userData.isBlocked;
        const updateuser = await userData.save();
        res.redirect('/admin/usermanagement')
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};



// const getproductmanagement = async (req,res) => {
//     try {
//         const newProduct =await product.find()
//         res.render('admin/productmanagement',{newProduct})

//     } catch (error) {

//         res.send(error)
//     }

// }


// Backend - admincontroller.js

// Backend - admincontroller.js

const getproductmanagement = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await product.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages

        const newProducts = await product.find().skip(skip).limit(perPage).sort({createdAt:-1});
        const existingCategories = await category.find();

        res.render('admin/productmanagement', { newProducts, existingCategories, totalPages, currentPage: parseInt(page) });
    } catch (error) {
        console.error("Error while fetching product management data:", error);
        res.status(500).send("Internal Server Error");
    }
};


const postBlockproduct = async (req, res) => {
    try {
        const productId = req.params._id;
        console.log("productId", productId);
        const productData = await product.findByIdAndUpdate(productId);
        console.log("find", productData);

        productData.isBlocked = !productData.isBlocked;
        const updateuser = await productData.save();
        console.log("updateuser", updateuser);

        res.redirect('/admin/productmanagement')

    } catch (error) {
        // Handle errors
        console.error('Error toggling product block status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getaddproductmanagement = async (req, res) => {
    try {

        const newProducts = await product.find();

        const existingCategories = await category.find();

        // Render the add product page with existing categories
        res.render('admin/addproduct', { existingCategories, errorMessage: req.flash("error") });
    } catch (error) {
        console.error("Error while fetching existing categories:", error);
        // Handle error appropriately
    }
}


const postaddproductmanagement = async (req, res) => {
    try {
        const { name, categoryName, stock, price, offerprice, description } = req.body;

        const existingproduct = await product.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });

        if (existingproduct) {
            req.flash("error", "Product name alredy exist");
            return res.redirect("/admin/add-product");
        }

        ///////// Check for empty product name/////////////
        if (name === '') {
            req.flash("error", "Product name cannot be empty");
            return res.redirect("/admin/add-product");
        }

        if (name.length >= 10) {
            req.flash("error", "Product Name is Too long!!!!!!")
            return res.redirect("/admin/add-product");

        }

        // Check for spaces in product name
        if (name.includes(' ')) {
            req.flash("error", "Product name cannot contain spaces");
            return res.redirect("/admin/add-product");
        }

        // Find the category by categoryName
        const categoryData = await category.findOne({ categoryName });

        // Check if category exists
        if (!categoryData) {
            throw new Error('Category not found');
        }

        let productImages = [];

        // Check if files are uploaded
        if (req.files && req.files.length > 0) {
            // Map each uploaded file to its URL
            const fileUrls = req.files.map((file) => `/uploads/${file.filename}`);
            productImages = fileUrls;
        } else {
            req.flash("error", "Product image cannot be empty");
            return res.redirect("/admin/add-product");
        }

        // Create a new product object
        const newProduct = new product({
            name,
            description,
            category: categoryName,
            productImages: productImages,
            stock,
            price,
            offerprice
        });

        // Save the new product to the database
        await newProduct.save();

        // Redirect to the product management page
        res.redirect("/admin/productmanagement");
    } catch (error) {
        console.error("Error while adding product:", error);
        res.status(500).send("Internal Server Error");
    }
};


const geteditProduct = async (req, res) => {
    try {
        const id = req.params._id; // Accessing the ID from request parameters

        const newProducts = await product.find();
        const existingCategories = await category.find();

        const editProduct = await product.findById(id); // Fetching product by ID


        // Passing editProduct to the template for rendering
        res.render('admin/editProduct', { editProduct: editProduct, newProducts: newProducts, existingCategories: existingCategories });

    } catch (error) {
        res.send(error);
    }
};


const postEditProduct = async (req, res) => {
    try {
        const id = req.params._id;
        let existingImage = req.body.existingImage;
        const images = req.files;
        let finalImage = [];
        // Fetch the existing product
        const productToEdit = await product.findById(id);
        if (!productToEdit) {
            return res.status(404).send("Product not found");
        }
        const { name, categoryName, stock, price, offerprice, description } = req.body
        // Update product attributes
        // Handle product images

        /*  */
        if (price < 0 || stock < 0) {
            return res.status(404).send("Product not found");
        } else if ((!existingImage || (Array.isArray(existingImage) && existingImage.length <= 0)) && images.length <= 0) {
            return res.status(404).send("Product not found");
        }
        /*  */
        if (images.length > 0) {
            const fileUrls = req.files.map((file) => `/uploads/${file.filename}`);
            finalImage = [...fileUrls];
        }
        if (Array.isArray(existingImage)) {
            finalImage = [...existingImage]
        } else {
            finalImage.push(existingImage)
        }

        productToEdit.productImages = finalImage

        // Save the updated product
        productToEdit.name = name;
        productToEdit.categoryName = categoryName;
        productToEdit.stock = stock;
        productToEdit.price = price;
        productToEdit.offerprice = offerprice;
        productToEdit.description = description;
        await productToEdit.save();

        res.redirect('/admin/productmanagement');
    } catch (error) {
        console.error("Error during edit product:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


const getcategorymanagement = async (req, res) => {

    try {
        const page = req.query.page || 1;
        const perPage = 5; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await category.countDocuments(); // Get total count of products
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages

        const existingCategories = await category.find().skip(skip).limit(perPage).sort({createdAt:-1});



        res.render('admin/categorymanagement', { existingCategories, totalPages, currentPage: parseInt(page) })

    }
    catch (error) {
        console.error("Error during category getting:", error);
        return res.status(500).json({ error: "Internal server error" });
    }

}


// category adding section 


// get
const getaddcategorymanagement = (req, res) => {
    try {



        res.render('admin/addcategory', { errorMessage: req.flash("error") })

    }
    catch (error) {
        console.log("internal server issue")
    }

}


// post
const postaddcategorymanagement = async (req, res) => {
    try {
        const categoryName = req.body.categoryName;
        const categoryNametrim = req.body.categoryName.trim();

        if (categoryNametrim === '') {
            req.flash("error", "Category name cannot be empty");
            return res.redirect("/admin/add-category");
        }
        if (categoryName.length > 15) {
            req.flash("error", "NAME IS TOO LONG MAKE IT SHORT");
            return res.redirect("/admin/add-category");
        }

        const existingCategory = await category.findOne({ categoryName: { $regex: new RegExp('^' + categoryName + '$', 'i') } });

        if (existingCategory) {
            req.flash("error", "Category already exists");
            return res.redirect("/admin/add-category");
        }
        else {
            const newCategory = await category.create({ categoryName: categoryName });
            console.log("New category created:", newCategory);

            res.redirect("/admin/categorymanagement");
        }
    } catch (error) {
        console.log("Internal server issue:", error);
        req.flash('error', 'Internal server issue. Please try again later.');
        res.redirect("/admin/categorymanagement");
    }
}


const geteditcategory = async (req, res) => {
    console.log("get edit ctaegory is working")

    try {
        const id = req.params._id;
        console.log('hhh', id);
        const editcategory = await category.findById({ _id: id })
        console.log("editcategory is getting ", editcategory)
        res.render("admin/editcategory", { editcategory: editcategory, errorMessage: req.flash("error") })

        // Adjusted the path here
    } catch (error) {
        console.error("Error during edit category:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


const posteditcategory = async (req, res) => {
    try {
        const id = req.params._id;
        const newCategoryName = req.body.categoryName.trim(); // Trim the new category name

        // Find the category being edited
        const categoryToEdit = await category.findById(id);

        if (!categoryToEdit) {
            return res.status(404).send("Category not found");
        }

        // Check if the new category name is empty
        if (newCategoryName === '') {
            req.flash("error", "Category name cannot be empty");
            return res.redirect("/admin/add-category");
        }

        // Check if the new category name already exists
        const existingCategory = await category.findOne({ categoryName: { $regex: new RegExp('^' + newCategoryName + '$', 'i') } });

        if (existingCategory && existingCategory._id.toString() !== id) {
            req.flash("error", "Category already exists");
            return res.redirect("/admin/add-category");
        }

        // Store the old category name before updating
        const oldCategoryName = categoryToEdit.categoryName;

        // Update the category name in the category collection
        categoryToEdit.categoryName = newCategoryName;
        await categoryToEdit.save();

        // Update the category name in the product collection
        await product.updateMany(
            { category: oldCategoryName }, // Match products with the old category name
            { $set: { category: newCategoryName } } // Set the new category name
        );

        res.redirect('/admin/categorymanagement');
    } catch (error) {
        console.error("Error during edit category:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}



const postBlockCategory = async (req, res) => {

    try {
        const categoryId = req.params._id;

        const categoryData = await category.findByIdAndUpdate(categoryId);


        categoryData.isVisible = !categoryData.isVisible;
        await categoryData.save();

        res.redirect('/admin/categorymanagement')
    } catch (error) {
        res.send(error)

    }
}



const logout = (req, res) => {

    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err)
        } else {
            // console.log("admin session");
            res.redirect('/admin');
        }
    });
}

// req.session.admin = false;
// res.redirect("/admin");
// }


const getorder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 6; // Number of products per page
        const skip = (page - 1) * perPage;

        const totalCount = await Order.countDocuments(); // Get total count of orders
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages

        const orders = await Order.find().populate('userId').sort({ createdAt: -1 }).skip(skip).limit(perPage).exec();

        res.render('admin/ordermanagement', { totalPages, orders, currentPage: page });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};




const changestatus = async (req, res) => {
    const { orderId } = req.params;
    const { productId, status } = req.body;

    try {
        await Order.updateOne(
            { _id: orderId, 'items.productId': productId }, // Ensure the order contains the specified product
            { $set: { 'items.$.status': status } } // Update the status of the specific product
        );
        res.redirect('/admin/order');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const getsalesreport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 10; // Number of orders per page
        const skip = (page - 1) * perPage;
        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};

        if (startDate && endDate) {
            ordersQuery.orderDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (filterOption) {
            const today = moment().startOf('day');
            switch (filterOption) {
                case 'daily':
                    startDate = today;
                    endDate = moment(today).endOf('day');
                    break;
                case 'weekly':
                    startDate = moment(today).startOf('isoWeek');
                    endDate = moment(today).endOf('isoWeek');
                    break;
                case 'monthly':
                    startDate = moment(today).startOf('month');
                    endDate = moment(today).endOf('month');
                    break;
            }
            ordersQuery.orderDate = {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            };
        }

        const orders = await Order.find(ordersQuery)
            .populate('userId')
            .skip(skip)
            .limit(perPage)
            .sort({ createdAt: -1 });

        const totalSalesCount = await Order.countDocuments(ordersQuery);
        const totalOrderAmount = await Order.aggregate([
            { $match: ordersQuery },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalAmount = totalOrderAmount[0] ? totalOrderAmount[0].total : 0;

        const userCountResult = await Order.aggregate([
        
            { $group: { _id: "$userId" } },
            { $count: "userCount" }
        ]);
        const userCount = userCountResult[0] ? userCountResult[0].userCount : 0;

        const totalPages = Math.ceil(totalSalesCount / perPage);

        res.render('admin/salesreport', {
            orders,
            totalSalesCount,
            totalOrderAmount: totalAmount,
            userCount,
            currentPage: page,
            totalPages,
            startDate,
            endDate,
            filterOption
        });

    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const getsalesPdf = async (req, res) => {
     try {
        console.log("Generating Sales PDF Report...");

        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};

        if (startDate && endDate) {
            ordersQuery.orderDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (filterOption) {
            const today = moment().tz('Asia/Kolkata').startOf('day');
            switch (filterOption) {
                case 'daily':
                    startDate = today;
                    endDate = moment(today).endOf('day');
                    break;
                case 'weekly':
                    startDate = moment(today).startOf('isoWeek');
                    endDate = moment(today).endOf('isoWeek');
                    break;
                case 'monthly':
                    startDate = moment(today).startOf('month');
                    endDate = moment(today).endOf('month');
                    break;
            }
            ordersQuery.orderDate = {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            };
        }

        const orders = await Order.find(ordersQuery).populate('userId').sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 30 });

        let filename = `Sales_Report_${new Date().toISOString()}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();

        // Table Header
        const tableHeaders = ['Order Date', 'Order ID', 'User Name', 'Product Name', 'Address', 'Discount Price', 'Total Price', 'Quantity', 'Payment Method'];
        doc.fontSize(12);
        tableHeaders.forEach(header => {
            doc.text(header, { continued: true, underline: true, width: 100, align: 'left' });
            doc.text(' ', { continued: true });
        });
        doc.moveDown();

        // Table Rows
        orders.forEach(order => {
            const orderDate = order.createdAt.toDateString();
            const orderId = order._id.toString();
            const userName = order.userId.name;
            const productName = order.items.map(item => item.productName).join(', ');
            const address = `${order.address.address}, ${order.address.city}, ${order.address.state}, ${order.address.pincode}`;
            const discountPrice = order.items.map(item => item.discountPrice).join(', ');
            const totalPrice = `₹${order.totalPrice}`;
            const quantity = order.totalQuantity.toString();
            const paymentMethod = order.paymentMethod;

            const row = [orderDate, orderId, userName, productName, address, discountPrice, totalPrice, quantity, paymentMethod];
            row.forEach(cell => {
                doc.text(cell, { continued: true, width: 100, align: 'left' });
                doc.text(' ', { continued: true });
            });
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const getsalesExcel = async (req, res) => {
    try {
        let { startDate, endDate, filterOption } = req.query;
        let ordersQuery = {};
        
        if (startDate && endDate) {
            ordersQuery.orderDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (filterOption) {
            const today = moment().startOf('day');
            switch (filterOption) {
                case 'daily':
                    startDate = today;
                    endDate = moment(today).endOf('day');
                    break;
                case 'weekly':
                    startDate = moment(today).startOf('isoWeek');
                    endDate = moment(today).endOf('isoWeek');
                    break;
                case 'monthly':
                    startDate = moment(today).startOf('month');
                    endDate = moment(today).endOf('month');
                    break;
            }
            ordersQuery.orderDate = {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            };
        }

        const orders = await Order.find(ordersQuery).populate('userId').sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order Date', key: 'orderDate', width: 15 },
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Product Name', key: 'productName', width: 30 },
            { header: 'Address', key: 'address', width: 50 },
            { header: 'Discount Price', key: 'discountPrice', width: 15 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 }
        ];

        orders.forEach(order => {
            const address = `${order.address.address}, ${order.address.city}, ${order.address.state}, ${order.address.pincode}`;
            const productNames = order.items.map(item => item.productName).join(', ');
            const discountPrices = order.items.map(item => item.discountPrice).join(', ');

            worksheet.addRow({
                orderDate: order.createdAt.toDateString(),
                orderId: order._id,
                userName: order.userId.name,
                productName: productNames,
                address: address,
                discountPrice: discountPrices,
                totalPrice: order.totalPrice,
                quantity: order.totalQuantity,
                paymentMethod: order.paymentMethod
            });
        });

        let filename = `Sales_Report_${new Date().toISOString()}.xlsx`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const getcouponmanagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 3; // Number of products per page
        const skip = (page - 1) * perPage;
    
        const totalCount = await Coupon.countDocuments(); // Get total count of coupons
        const totalPages = Math.ceil(totalCount / perPage); // Calculate total pages
        const coupons = await Coupon.find().skip(skip).limit(perPage).sort({ createdAt: -1 }); // Fetch paginated coupons
    
        res.render('admin/couponmanagement', {
          coupons,
          totalPages,
          currentPage: page
        });
      }catch (error) {
      console.log(error);
      res.status(500).send('Internal Server Error');
    }
  };
  



const getaddcoupon = async (req,res) => {

    try {
       

        // Render the add product page with existing categories
        res.render('admin/addcoupon');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}


const postaddcoupon = async (req,res) => {
    try {
        console.log("Coupon fetched", req.body);
    
        // Extract data from request body
        const { couponCode, discount, createDate, expiryDate } = req.body;
    
        // Create a new coupon instance
        const newCoupon = new Coupon({
          code: couponCode,
          discountValue: discount,
          usedBy: new Date(createDate),
          expirationDate: new Date(expiryDate),
        });
    
        // Save the coupon to the database
        await newCoupon.save();
    
        // Redirect to the coupon management page
        res.redirect("/admin/coupon");
      } catch (error) {
         console.log(error);
        res.status(500).send('Internal Server Error');
     }
}



const geteditcoupon = async (req,res) => {
     try {
        const id = req.params._id; // Accessing the ID from request parameters



        const coupons = await Coupon.findById(id); 

        res.render('admin/editcoupon',{coupons});
     } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
     }
}


const posteditcoupon = async (req, res) => {
    try {
        const id = req.params._id; // Accessing the ID from request parameters
        const { couponCode, discount, createDate, expiryDate } = req.body; // Accessing data from form body

        // Find the coupon by ID
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        // Update the coupon fields with the new values from the form
        coupon.code = couponCode;
        coupon.discountValue = discount;
        coupon.usedBy = new Date(createDate);
        coupon.expirationDate = new Date(expiryDate);

        // Save the updated coupon
        await coupon.save();

        // Redirect to coupon management page or send a success response
        res.redirect('/admin/coupon');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const deleteCoupon = async (req, res) => {
  
    try {
        const id = req.params // Accessing the ID from request parameters
        
        // Check if the coupon exists
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        // Delete the coupon from the database
        await Coupon.findByIdAndDelete(id);

        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = {
    getlogin,
    postlogin,
    getdashbord,
    getusermanagement,
    getproductmanagement,
    getcategorymanagement,
    getaddcategorymanagement,
    postaddcategorymanagement,
    geteditcategory,
    posteditcategory,
    getaddproductmanagement,
    postaddproductmanagement,
    postBlockproduct,
    postBlockUser,
    postBlockCategory,
    geteditProduct,
    logout,
    postEditProduct,
    getorder,
    changestatus,
    getsalesreport,
    getsalesPdf,
    getsalesExcel,
    getcouponmanagement,
    getaddcoupon,
    postaddcoupon,
    geteditcoupon,
    posteditcoupon,
    deleteCoupon



}




const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const passport=require('passport')

const bodyParser = require('body-parser');
const userRouter = require('./router/user');
const adminRouter = require('./router/admin');
const app = express();
require('dotenv').config();

const passportSetup=require('./config/passport-setup.js')
app.use(bodyParser.json());
const flash = require("connect-flash")

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use("/uploads",express.static('uploads'));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'your-Secret-Key',
    resave: false,
    saveUninitialized: false
}));

app.use(flash())

app.use(passport.initialize());
app.use(passport.session())




const PORT = process.env.PORT


const MONGODB_URI = process.env.MONGODB_URI;

/* DEVELOPMENT BEGIN */

    // app.use((req,res,next)=>{
    //     req.session.user="666454ac0e62ed10f3dea3f9"
    //     req.session.admin="alameena8841@gmail.com"
    //     next()
    // })

/* DEVELOPMENT END */

app.use('/', userRouter);
app.use('/admin', adminRouter)


app.use((req,res) => {
res.render("user/404")
})

mongoose.connect(MONGODB_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
        });
        console.log('MongoDB has connected');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
    });

const collection = require('../model/user');

exports.isUser=async (req,res,next)=>{
    
     if( req.session.user){
        const user=await collection.findById( req.session.user)
        if(user.isBlocked){
            delete  req.session.user
            res.redirect("/login")
        }else{
            next();
        }
        
        }
    else{
            res.redirect("/login")
    } 

    }
exports.isAdmin=(req,res,next)=>{
    if(req.session.admin){
        next();
        }
        else{
            res.redirect("/admin")
        } 

    }
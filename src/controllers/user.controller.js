import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"; 
import { apiresponse } from "../utils/apiresponse.js";

import { user } from "../models/user.model.js"; 
const registeruser = asynchandler( async (req, res) => {
const {fullname,email,username,password}=req.body
console.log("email",email);
if(
    [fullname,email,username,password].some((field)=>
    field?.trim()=="")
){
    throw new apierror(400,"all fields are required")
}
const existeduser = user.findone({
    $or: [{username},{email}]
})

if(existeduser){
    throw new apierror(409,"user with email  or username already exists")
}

const avatarlocalpath =req.files?.avatar[0]?.path
const coverimagelocalpath =req.files?.coverimage[0]?.path;

if(!avatarlocalpath){
    throw new apierror(400,"avatar file is required")
}
const avatar = await uploadOnCloudinary(avatarlocalpath)
const coverimage = await uploadOnCloudinary(coverimagelocalpath)

if(!avatar){
    throw new apierror(400,"avatar file is required")
}
user.create({
  fullname,
  avatar: avatar.url,
  coverimage: coverimage?.url || "",
  email,
  password,
  username: username.tolowercase()
   
})

const createuser = await user.findById(user._id).select(
    "-password - refreshtoken"
)

if(!createuser){
    throw new apierror(500,"something went  error while registering the user")
}
 return res.status(201).json(
    new apiresponse(200, createuser,"user registered successfully")
 )


})

export { registeruser };

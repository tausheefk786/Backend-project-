import express from "express";
import cors from "cors";
import cookieparser from "cookie-parser";


const app=  express();

app.use(cors({
    origin: process.env.cors_origin || "http://localhost:3000",
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true,limit:
    "16kb"
}))

app.use(express.static("public"))
app.use(cookieparser())



//routes
import userrouter from './routes/user.routes.js'

app.use("/api/v1/users",userrouter)


export {app};
// .then(()=>{
//     app.listen(process.env.PORT || 8000 ,()=>{
//         console.log(`server is running at port : ${process.env.PORT}`);
//     })
// })
// .catch(err)=>{
//     console.log("MONGO db connection failed !!!",err);
// }


import mongoose from "mongoose";
import { DB_name } from "../constants.js";



const connectDB = async ()=>{
    try{
        const connectioninstance =await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`)
        console.log(`\n mongodb connected !! db host : ${connectioninstance.connection.host}`)

    }catch(error){
        console.log("MONGODB connection error",error);
        process.exit(1)
    }

}


export default connectDB;
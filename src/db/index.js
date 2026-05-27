import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


export const connectDB = async () => {

    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        console.log(`\n MONGO CONNECTED !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGO connection FAILED", error)
        process.exit(1)
    }

}

export default connectDB
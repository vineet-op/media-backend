import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: "./.env"
})

const port = process.env.PORT || 8000

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})

connectDB().catch((err) => {
    console.error("MongoDB connection failed (server still running):", err?.message || err)
})

/*
    (async () => {
        try {
            await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
            app.on("error", (error) => {
                console.log("ERRR:", error)
                throw error
            })
            app.listen(process.env.PORT, () => {
                console.log(`App is listing on port, ${process.env.PORT}`)
            })
        } catch (error) {
            console.log(error)
            throw error
        }
    })()
*/
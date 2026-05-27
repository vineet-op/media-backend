import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors())
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extends: true, limit: "16kb" }))
app.use(cookieParser())

export { app }
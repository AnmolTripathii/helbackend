import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:'16kb'}))
app.use(express.static("public"))
app.use(cookieParser())

//routes

import userRouter from './routes/user.routes.js'
app.use("/api/v1/users",userRouter)
export{app}
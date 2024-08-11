import {Router} from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { createClassroom,registerUser,loginUser,logoutUser,updateUser, deleteUser, getlist, getCurrentUser, getdata } from "../controllers/user.controller.js"
import { authorizeUpdate } from "../middlewares/check.middleware.js"

const router=Router()
router.route("/createclassroom").post(verifyJWT,createClassroom)
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route('/logout').post(verifyJWT,logoutUser)
router.route('/update/:id').put(verifyJWT, authorizeUpdate, updateUser);
router.route('/delete/:id').delete(verifyJWT, deleteUser);
router.route('/getlist').get(verifyJWT,getlist)
router.route('/data/:id').get(verifyJWT,getdata)
router.route('/getuser').get(verifyJWT,getCurrentUser)
router.get('/', async (req, res) => {
    res.send("hello world");
});
export default router

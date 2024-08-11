import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const authorizeUpdate = asyncHandler(async (req, res, next) => {
    const userIdToUpdate = req.params.id;
    const user = req.user; 
    const isAdmin = user.role === "Admin";
    const isTeacher = user.role === "Teacher";
    const isStudent = user.role === "Student";

    if (isAdmin) {
        return next();
    }

    if (isTeacher) {
        const userToUpdate = await User.findById(userIdToUpdate);
        if (!userToUpdate) {
            return res.status(404).json({
                success: false,
                message: "User to update not found",
            });
        }
        if (userToUpdate.role === "Student") {
            return next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Teachers can only update students' data",
            });
        }
    }

    if (isStudent) {
        return res.status(403).json({
            success: false,
            message: "Students are not authorized to update any user data",
        });
    }

    return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
    });
});

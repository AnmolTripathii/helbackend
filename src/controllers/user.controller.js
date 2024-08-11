import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from "../models/user.model.js";
import { Classroom } from "../models/classroom.model.js";
import mongoose from "mongoose";

const generateToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        return accessToken
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Something went wrong while generating access token",
        });
    }
}
const createClassroom = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role !== 'Admin') {
        // throw new ApiError(409, "Only the principal can create the classroom");
        return res
            .status(409)
            .json(
                {
                    success: false,
                    message: "Only the principal can create the classroom"
                }
            )
    }

    const { name, start_time, end_time, days_in_session } = req.body;


    if ([name, start_time, end_time].some((field) => field?.trim() === "")) {
        // throw new ApiError(400, "All fields are required");
        return res
            .status(400)
            .json(
                {
                    success: false,
                    message: "All fields are required"
                }
            )
    }

    if (!Array.isArray(days_in_session) || days_in_session.length === 0) {
        // throw new ApiError(400, "days_in_session should be a non-empty array");
        return res
            .status(400)
            .json(
                {
                    success: false,
                    message: "days_in_session should be a non-empty array"
                }
            )
    }


    const existedClass = await Classroom.findOne({ name });
    if (existedClass) {
        // throw new ApiError(409, "Classroom with this name already exists");
        return res
            .status(409)
            .json(
                {
                    success: false,
                    message: "Classroom with this name already exists"
                }
            )
    }

    const newClass = await Classroom.create({
        name,
        start_time,
        end_time,
        days_in_session,
    });

    const createdClass = await Classroom.findById(newClass._id).select("-teacher_id");
    if (!createdClass) {
        // throw new ApiError(500, "Something went wrong when creating the classroom");
        return res
            .status(409)
            .json(
                {
                    success: false,
                    message: "Something went wrong when creating the classroom"
                }
            )
    }

    return res.status(201).json(
        new ApiResponse(200, createdClass, "Classroom Created")
    );
});
const registerUser = asyncHandler(async (req, res) => {
    const { name, role, email, password, classroom, confirmReassign } = req.body;

    if ([name, role, email, password].some((field) => field?.trim() === "")) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    const existedUser = await User.findOne({ email });
    if (existedUser) {
        return res.status(409).json({
            success: false,
            message: "User with this email already exists",
        });
    }

    let classroomId = null;

    if (classroom && classroom.trim() !== "") {
        const foundClassroom = await Classroom.findOne({ name: classroom.trim() });
        if (!foundClassroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found",
            });
        }

        classroomId = foundClassroom._id;

        if (role === 'Teacher') {
            const teacherAssigned = await User.findOne({ classroom_id: classroomId, role: 'Teacher' });

            if (teacherAssigned) {
                if (!confirmReassign) {
                    return res.status(409).json({
                        success: false,
                        message: "A teacher is already assigned to this classroom. Confirm reassignment.",
                    });
                }

                teacherAssigned.classroom_id = null;
                await teacherAssigned.save();

                foundClassroom.teacher_id = null;
                await foundClassroom.save();
            }
        }
    }

    const user = await User.create({
        name,
        role,
        email,
        password,
        classroom_id: classroomId,
    });


    const createdUser = await User.findById(user._id).select("-password");
    if (!createdUser) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong during the registration",
        });
    }
    if (classroom && classroom.trim() !== "") {
        const foundClassroom = await Classroom.findOne({ name: classroom.trim() });
        if (!foundClassroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found",
            });
        }
        if (createdUser.role === 'Teacher') {
            foundClassroom.teacher_id = createdUser._id;
            await foundClassroom.save();
        }
    }


    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered")
    );
});


const loginUser = asyncHandler(async (req, res) => {
    const { email, role, password } = req.body;

    if ([role, email, password].some((field) => field?.trim() === "")) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "NO User Found with this Email.",
        });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Incorrect Password",
        });
    }

    const accessToken = await generateToken(user._id);
    if (!accessToken) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong while generating access token",
        });
    }
    console.log(accessToken);
    const loggedInUser = await User.findById(user._id).select("-password");

    const options = {
        httpOnly: true,
        secure: true, 
        sameSite: 'None',
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true, 
        sameSite: 'None',
    };
    return res.status(200)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, email, password, classroom, confirmReassign } = req.body;

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    let classroomId = null;
    if (classroom && classroom.trim() !== "" && role === 'Teacher') {
        const foundClassroom = await Classroom.findOne({ name: classroom.trim() });
        if (!foundClassroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found",
            });
        }

        const teacherAssigned = await User.findOne({ classroom_id: foundClassroom._id, role: 'Teacher' });

        if (teacherAssigned && teacherAssigned._id.toString() !== id) {
            if (!confirmReassign) {
                return res.status(409).json({
                    success: false,
                    message: "A teacher is already assigned to this classroom. Confirm reassignment.",
                });
            }

            teacherAssigned.classroom_id = null;
            await teacherAssigned.save();
        }

        classroomId = foundClassroom._id;
    }

    if (name && name.trim() !== "") user.name = name;
    if (role && role.trim() !== "") user.role = role;
    if (email && email.trim() !== "") user.email = email;
    if (password && password.trim() !== "") user.password = password;
    if (classroomId) user.classroom_id = classroomId;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    return res.status(200).json(
        new ApiResponse(200, updatedUser, "User updated successfully")
    );
});


const deleteUser = asyncHandler(async (req, res) => {
    const { role } = req.user;
    const { id: userId } = req.params;

    if (role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to perform this action",
        });
    }

    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    if (userToDelete.role === 'Teacher') {
        const classroom = await Classroom.findOne({ teacher_id: userToDelete._id });

        if (classroom) {
            classroom.teacher_id = null;
            await classroom.save();
        }
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json(
        new ApiResponse(200, null, "User deleted successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});
const getdata = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID format",
        });
    }

    try {
        const data = await User.findById(id).select("-password");

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json(new ApiResponse(200, data, "User fetched successfully"));
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
const getlist = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role === 'Admin') {
        const teachers = await User.find({ role: 'Teacher' })
            .populate('classroom_id', 'name')
            .select('-password');
        const students = await User.find({ role: 'Student' })
            .populate('classroom_id', 'name')
            .select('-password');
        return res.json(new ApiResponse(200, { teachers, students }, 'List of teachers and students'));
    }

    if (role === 'Teacher') {
        const teacher = await User.findById(req.user._id).populate({
            path: 'classroom_id',
            select: 'name',
        });
        if (!teacher || !teacher.classroom_id) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found',
            });
        }
        const students = await User.find({ classroom_id: teacher.classroom_id._id, role: 'Student' })
            .populate('classroom_id', 'name')
            .select('-password');
        return res.json(new ApiResponse(200, students, 'List of students in your classroom'));
    }

    if (role === 'Student') {
        const student = await User.findById(req.user._id).populate({
            path: 'classroom_id',
            select: 'name',
        });
        if (!student || !student.classroom_id) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found',
            });
        }
        const students = await User.find({ classroom_id: student.classroom_id._id, role: 'Student' })
            .populate('classroom_id', 'name')
            .select('-password');
        return res.json(new ApiResponse(200, students, 'List of students in your classroom'));
    }

    return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this list',
    });
});



export { createClassroom, registerUser, loginUser, logoutUser, updateUser, deleteUser, getlist, getCurrentUser, getdata };

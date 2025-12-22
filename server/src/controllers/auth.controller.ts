import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import prisma from "../db/db";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

// register 
const register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) {
        throw new ApiError(400, "Name, email and password are required")
    }
    const existingUser = await prisma.user.findUnique({
        where: {
            email
        }
    })
    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }
    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long")
    }
    if (role !== "ADMIN" && role !== "TEACHER") {
        throw new ApiError(400, "Role must be either ADMIN or TEACHER")
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role
        }
    })
    res.status(201).json(new ApiResponse(201, user, "User registered successfully"))
});

// login
const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }
    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }
    const token = generateToken({
        id: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
    });

    res.status(200).json(new ApiResponse(200, { user, token }, "User logged in successfully"));
});

// logout
const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(400, "User not found");
    }
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            tokenVersion: { increment: 1}
        }
    })
    res.status(200).json(new ApiResponse(200, {}, "User logged out successfully"))
})

// change-Password
const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const userId = req.user?.id

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    })
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }
    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password cannot be same as old password");
    }
    if (newPassword.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            password: hashedPassword,
            tokenVersion: { increment: 1 }
        }
    })
    res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

// forgot-password
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await prisma.user.findUnique({
        where: {
            email
        }
    })
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const token = generateToken({
        id: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
    });

    // TODO: send email (nodemailer)
    console.log("TOKEN: ", token);

    res.status(200).json(new ApiResponse(200, { token }, "Password reset link sent successfully"))
})

// reset-password
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        throw new ApiError(400, "Token and new password are required");
    }
    if (newPassword.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            throw new ApiError(401, "Invalid token");
        }
        const user = await prisma.user.findUnique({
            where: {
                id: decoded.id
            }
        })
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: {
                id: decoded.id
            },
            data: {
                password: hashedPassword,
                tokenVersion: { increment: 1 }
            }
        })

        
        res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"))

    } catch (error) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }
})

export {
    register,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword
};
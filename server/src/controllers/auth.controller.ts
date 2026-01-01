import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import prisma from "../db/db";
import { hashPassword, comparePassword, generateToken, verifyToken, generateRefreshToken } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Role } from "@prisma/client";

interface registerBody {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    address?: string;
    // Student specific fields
    rollNo?: string;
    classId?: string;
    parentName?: string;
    parentPhone?: string;
}

interface loginBody {
    email: string;
    password: string;
}

interface changePasswordBody {
    oldPassword: string;
    newPassword: string;
}

interface forgotPasswordBody {
    email: string;
}

interface resetPasswordBody {
    token: string;
    newPassword: string;
}

interface refreshTokenBody {
    refreshToken: string;
}

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken }: refreshTokenBody = req.body;
    if (!refreshToken) {
      throw new ApiError(400, "Refresh token is required");
    }

    // find refresh token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId }
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = generateToken({
      id: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion
    });

    return res.status(200).json(new ApiResponse(200,{ accessToken },"Access token refreshed successfully"));
  }
);

// register 
const register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role, phone, address, rollNo, classId, parentName, parentPhone } : registerBody = req.body
    
    if (!name || !email || !password) {
        throw new ApiError(400, "Name, email and password are required")
    }
    
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })
    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }
    
    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long")
    }
    
    if (role !== "ADMIN" && role !== "TEACHER" && role !== "STUDENT") {
        throw new ApiError(400, "Role must be ADMIN, TEACHER, or STUDENT")
    }

    // Validate student-specific requirements
    if (role === "STUDENT") {
        if (!rollNo || !classId) {
            throw new ApiError(400, "Roll number and class ID are required for students")
        }
        
        // Check if class exists
        const classExists = await prisma.class.findUnique({
            where: { id: classId }
        })
        if (!classExists) {
            throw new ApiError(400, "Invalid class ID")
        }
        
        // Check if roll number is unique in the class
        const existingStudent = await prisma.student.findFirst({
            where: {
                rollNo,
                classId
            }
        })
        if (existingStudent) {
            throw new ApiError(400, "Roll number already exists in this class")
        }
    }

    const hashedPassword = await hashPassword(password)
    
    // Create user and student profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                phone,
                address
            }
        })
        
        // Create student profile if role is STUDENT
        if (role === "STUDENT" && rollNo && classId) {
            await tx.student.create({
                data: {
                    id: user.id,
                    rollNo,
                    classId,
                    parentName,
                    parentPhone
                }
            })
        }
        
        return user
    })
    
    const { password: _, ...userWithoutPassword } = result
    res.status(201).json(new ApiResponse(201, userWithoutPassword, "User registered successfully"))
});

// login
const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: loginBody = req.body;
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
    const accessToken = generateToken({
        id: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
    });

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });

    const token = {
        accessToken,
        refreshToken
    }

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
            tokenVersion: { increment: 1 }
        }
    })

    await prisma.refreshToken.deleteMany({
        where: { userId }
    });

    res.status(200).json(new ApiResponse(200, {}, "User logged out successfully"))
})

// change-Password
const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { oldPassword, newPassword }: changePasswordBody = req.body;
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
    const { email }: forgotPasswordBody = req.body;
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
    const { token, newPassword }: resetPasswordBody = req.body;
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

// get current user with profile
const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(400, "User not found");
    }
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            employeeId: true,
            // Teacher profile fields
            designation: true,
            qualification: true,
            experience: true,
            specialization: true,
            isActive: true,
            createdAt: true,
            studentProfile: {
                select: {
                    id: true,
                    rollNo: true,
                    parentName: true,
                    parentPhone: true,
                    admissionDate: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            section: true,
                            subjects: true,
                            teacher: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

export {
    register,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    getCurrentUser
};
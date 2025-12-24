import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";

// create class
const createClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, section, subject } = req.body;
    if (!name || !subject) {
        throw new ApiError(400, "Name and subject are required");
    }

    const teacherId = req.user?.id;
    if (!teacherId) {
        throw new ApiError(401, "Unauthorized");
    }

    const classExists = await prisma.class.findFirst({
        where: {
            name,
            subject,
            teacherId
        }
    });
    if (classExists) {
        throw new ApiError(400, "Class already exists");
    }

    const newClass = await prisma.class.create({
        data: {
            name,
            section,
            subject,
            teacherId
        }
    });
    res.status(201).json(new ApiResponse(201, newClass, "Class created successfully"));
})

// get all classes
const getAllClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teacherId = req.user?.id;
    const userRole = req.user?.role;
    
    let whereClause = {};
    if (userRole === "TEACHER") {
        whereClause = { teacherId };
    }
    
    const classes = await prisma.class.findMany({
        where: whereClause,
        include: { students: true }
    });
    res.status(200).json(new ApiResponse(200, classes, "Classes fetched successfully"));
})

export {
    createClass, 
    getAllClasses
}
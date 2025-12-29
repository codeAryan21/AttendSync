import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";
import { Role } from "@prisma/client";

interface createClassBody {
    name: string;
    section?: string;
    subject: string;
}

interface updateClassBody {
    name: string;
    section?: string;
    subject: string;
}

// create class
const createClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, section, subject }: createClassBody = req.body;
    if (!name || !subject) {
        throw new ApiError(400, "Name, section and subject are required");
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
    if (userRole === Role.TEACHER) {
        whereClause = { teacherId };
    }
    
    const classes = await prisma.class.findMany({
        where: whereClause,
        include: { 
            students: true,
            _count: {
                select: { students: true }
            }
        }
    });
    res.status(200).json(new ApiResponse(200, classes, "Classes fetched successfully"));
})

// update class
const updateClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, section, subject }: updateClassBody = req.body;
    const teacherId = req.user?.id;
    
    if (!name || !subject) {
        throw new ApiError(400, "Name and subject are required");
    }
    
    const existingClass = await prisma.class.findUnique({
        where: { id }
    });
    
    if (!existingClass) {
        throw new ApiError(404, "Class not found");
    }
    
    if (existingClass.teacherId !== teacherId && req.user?.role !== Role.ADMIN) {
        throw new ApiError(403, "Not authorized to update this class");
    }
    
    const updatedClass = await prisma.class.update({
        where: { id },
        data: { name, section, subject }
    });
    
    res.status(200).json(new ApiResponse(200, updatedClass, "Class updated successfully"));
})

// delete class
const deleteClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const teacherId = req.user?.id;
    
    const existingClass = await prisma.class.findUnique({
        where: { id }
    });
    
    if (!existingClass) {
        throw new ApiError(404, "Class not found");
    }
    
    if (existingClass.teacherId !== teacherId && req.user?.role !== Role.ADMIN) {
        throw new ApiError(403, "Not authorized to delete this class");
    }
    
    await prisma.class.delete({
        where: { id }
    });
    
    res.status(200).json(new ApiResponse(200, {}, "Class deleted successfully"));
})

export {
    createClass, 
    getAllClasses,
    updateClass,
    deleteClass
}
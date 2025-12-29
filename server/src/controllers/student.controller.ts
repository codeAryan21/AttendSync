import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";
import { Role } from "@prisma/client";

interface addStudentBody {
    name: string;
    rollNo: string;
    classId: string;
}

interface updateStudentBody {
    name: string;
    rollNo: string;
}

// add student
const addStudent = asyncHandler(async (req: Request, res: Response) => {
    const { name, rollNo, classId }: addStudentBody = req.body;
    if (!name || !rollNo || !classId) {
        throw new ApiError(400, "Name, rollNo and classId are required");
    }

    const studentExists = await prisma.student.findFirst({
        where: {
            rollNo,
            classId
        }
    });
    if (studentExists) {
        throw new ApiError(400, "Student with this roll number already exists in this class");
    }

    const newStudent = await prisma.student.create({
        data: {
            name,
            rollNo,
            classId
        }
    });
    res.status(201).json(new ApiResponse(201, newStudent, "Student added successfully"));
})

// get student by class
const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    if (!classId) {
        throw new ApiError(400, "ClassId is required");
    }

    const classExists = await prisma.class.findFirst({
        where: {
            id: classId as string
        }
    });
    if (!classExists) {
        throw new ApiError(400, "Class does not exist");
    }
    
    // Allow admin to view any class, teachers only their own
    if (req.user?.role === Role.TEACHER && classExists.teacherId !== req.user?.id) {
        throw new ApiError(403, "You are not authorized to view this class");
    }

    const students = await prisma.student.findMany({
        where: {
            classId: classId as string
        }
    });
    res.status(200).json(new ApiResponse(200, students, "Students fetched successfully"));
})

// update student
const updateStudent = asyncHandler(async (req: Request, res: Response) => {
    const { name, rollNo }: updateStudentBody = req.body;
    const { id } = req.params;
    if (!name || !rollNo) {
        throw new ApiError(400, "Name and rollNo is required");
    }

    const studentExists = await prisma.student.findFirst({
        where: {
            id
        }
    });
    if (!studentExists) {
        throw new ApiError(400, "Student does not exist");
    }

    const updatedStudent = await prisma.student.update({
        where: {
            id
        },
        data: {
            name,
            rollNo
        }
    });
    res.status(200).json(new ApiResponse(200, updatedStudent, "Student updated successfully"));
})

// delete student
const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new ApiError(400, "Id is required");
    }

    const studentExists = await prisma.student.findFirst({
        where: {
            id
        }
    });
    if (!studentExists) {
        throw new ApiError(400, "Student does not exist");
    }

    const deletedStudent = await prisma.student.delete({
        where: {
            id
        }
    });
    res.status(200).json(new ApiResponse(200, deletedStudent, "Student deleted successfully"));
})

export {
    addStudent,
    getStudents,
    updateStudent,
    deleteStudent
}
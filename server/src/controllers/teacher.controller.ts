import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";

interface UpdateTeacherProfileBody {
    name?: string;
    phone?: string;
    address?: string;
    designation?: string;
    qualification?: string;
    experience?: number;
    specialization?: string;
}

const getTeacherProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teacherId = req.user?.id;
    
    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            employeeId: true,
            designation: true,
            qualification: true,
            experience: true,
            specialization: true,
            createdAt: true
        }
    });
    
    if (!teacher) {
        throw new ApiError(404, "Teacher not found");
    }
    
    res.status(200).json(new ApiResponse(200, teacher, "Teacher profile fetched successfully"));
});

const updateTeacherProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teacherId = req.user?.id;
    const { name, phone, address, designation, qualification, experience, specialization }: UpdateTeacherProfileBody = req.body;
    
    const updateData: any = {};
    if (name?.trim()) updateData.name = name.trim();
    if (phone?.trim()) updateData.phone = phone.trim();
    if (address?.trim()) updateData.address = address.trim();
    if (designation?.trim()) updateData.designation = designation.trim();
    if (qualification?.trim()) updateData.qualification = qualification.trim();
    if (experience !== undefined) updateData.experience = experience;
    if (specialization?.trim()) updateData.specialization = specialization.trim();
    
    const updatedTeacher = await prisma.user.update({
        where: { id: teacherId },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            employeeId: true,
            designation: true,
            qualification: true,
            experience: true,
            specialization: true
        }
    });
    
    res.status(200).json(new ApiResponse(200, updatedTeacher, "Teacher profile updated successfully"));
});

export { getTeacherProfile, updateTeacherProfile };
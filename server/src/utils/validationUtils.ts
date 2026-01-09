import { ApiError } from "./apiError";
import prisma from "../db/db";

export const validateStudentData = async (rollNo: string, classId: string) => {
    if (!rollNo || !classId) {
        throw new ApiError(400, "Roll number and class ID are required for students");
    }
    
    const classExists = await prisma.class.findUnique({
        where: { id: classId }
    });
    if (!classExists) {
        throw new ApiError(400, "Invalid class ID");
    }
    
    const existingStudent = await prisma.student.findFirst({
        where: { rollNo, classId }
    });
    if (existingStudent) {
        throw new ApiError(400, "Roll number already exists in this class");
    }
};

export const formatAddressWithInfo = (address?: string, dateOfBirth?: string, gender?: string): string => {
    if (!dateOfBirth && !gender) return address || '';
    
    const additionalInfo = [];
    if (dateOfBirth) additionalInfo.push(`DOB: ${dateOfBirth}`);
    if (gender) additionalInfo.push(`Gender: ${gender}`);
    
    return address ? `${address} | ${additionalInfo.join(', ')}` : additionalInfo.join(', ');
};
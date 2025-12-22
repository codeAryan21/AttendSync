import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyToken } from "../services/auth.service";
import prisma from "../db/db";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: "ADMIN" | "TEACHER";
    };
}

export const authMiddleware = asyncHandler(async(req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        })
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            return res.status(401).json({ message: "Session expired" })
        }

        req.user = {
            id: decoded.id,
            role: decoded.role
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requireRole = (roles: ("ADMIN" | "TEACHER" | "STUDENT")[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        
        next();
    };
};

export const requireAdmin = requireRole(["ADMIN"]);
export const requireTeacher = requireRole(["TEACHER", "ADMIN"]);
export const requireStudent = requireRole(["STUDENT", "ADMIN"]);
import { z } from "zod"
import { Request, Response, NextFunction } from "express"

const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters long")
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
);

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Invalid email address"),
    password: passwordSchema,
    role: z.enum(["ADMIN", "TEACHER"]).default("TEACHER")
})

const loginSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    loginType: z.enum(["staff", "student"]).optional()
})

type ValidationSchema = "register" | "login"

const schemas: Record<ValidationSchema, z.ZodTypeAny> = {
    register: registerSchema,
    login: loginSchema
}

export const validate = (schemaName: ValidationSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schemas[schemaName].parse(req.body)
            next()
        } catch (error: any) {
            const message = error?.errors?.[0]?.message || "Validation failed"
            return res.status(400).json({ message })
        }
    }
}
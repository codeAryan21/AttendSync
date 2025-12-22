import { ApiError } from "../utils/apiError";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
};
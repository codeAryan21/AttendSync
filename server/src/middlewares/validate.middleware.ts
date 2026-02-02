import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import * as schemas from '../schemas';

type ValidationType = 'body' | 'params' | 'query';

export const validate = (schema: z.ZodTypeAny, type: ValidationType = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = type === 'body' ? req.body : type === 'params' ? req.params : req.query;
      const validated = schema.parse(data);
      
      if (type === 'body') req.body = validated;
      else if (type === 'params') req.params = validated as any;
      else req.query = validated as any;
      
      next();
    } catch (error: any) {
      const errors = error?.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ field: 'unknown', message: 'Validation failed' }];
      
      return res.status(400).json({ 
        message: 'Validation failed',
        errors
      });
    }
  };
};

// Legacy support
export const validateBody = (schema: z.ZodTypeAny) => validate(schema, 'body');
export const validateParams = (schema: z.ZodTypeAny) => validate(schema, 'params');
export const validateQuery = (schema: z.ZodTypeAny) => validate(schema, 'query');

// Export schemas for easy access
export { schemas };
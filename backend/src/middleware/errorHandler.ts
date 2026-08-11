import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Wraps async route handlers so thrown errors reach the global error handler
export const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: (e as any).path, message: e.msg })),
    });
  }
  next();
};

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
};

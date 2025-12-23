import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err as Error);
    }
  };
}

export function validateQuery(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      // Express' req.query typing is very loose; casting here keeps strict TS happy.
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      next(err as Error);
    }
  };
}




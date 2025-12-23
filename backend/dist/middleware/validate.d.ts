import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
export declare function validateBody(schema: ZodSchema): RequestHandler;
export declare function validateQuery(schema: ZodSchema): RequestHandler;
//# sourceMappingURL=validate.d.ts.map
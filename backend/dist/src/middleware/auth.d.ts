import type { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map
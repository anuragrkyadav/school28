import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../config/jwt.js";
import type { AuthenticatedUser, Role } from "../types/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.accessToken;

  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    next(new ApiError(401, "Access token required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('email firstName lastName role isActive schoolId');

    if (!user) {
      next(new ApiError(401, "Authenticated user not found"));
      return;
    }

    if (!user.isActive) {
      next(new ApiError(403, "This account is currently inactive"));
      return;
    }

    // Tenant Isolation Check:
    // If the request resolved a specific school tenant context (subdomain/header),
    // we must verify that this authenticated user is actually registered to that school.
    // SUPER_ADMIN is exempt from this check.
    if (user.role !== 'SUPER_ADMIN') {
      const userSchoolIdStr = user.schoolId ? user.schoolId.toString() : '';
      
      if (req.schoolId && userSchoolIdStr !== req.schoolId) {
        next(new ApiError(403, "Access denied: Your account belongs to a different school"));
        return;
      }
    }

    // Populate req.schoolId from the authenticated user if it wasn't already set by tenant middleware
    if (!req.schoolId && user.schoolId) {
      req.schoolId = user.schoolId.toString();
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role as Role,
      schoolId: user.schoolId ? user.schoolId.toString() : undefined,
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
  }
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "Insufficient permissions for this resource"));
      return;
    }

    next();
  };
}

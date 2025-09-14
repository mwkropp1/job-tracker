/**
 * Authentication middleware for JWT token verification and user context injection.
 * Provides both required and optional authentication mechanisms.
 */

import { Request, Response, NextFunction } from 'express'

import { verifyToken } from '../utils/auth'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
      }
    }
  }
}

/**
 * Middleware requiring valid JWT authentication for protected routes.
 * Extracts Bearer token from Authorization header and validates signature.
 * Injects user context into request object for downstream middleware.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @returns 401 for missing token, 403 for invalid/expired token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Extract token from 'Bearer TOKEN'

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  try {
    const decoded = verifyToken(token)
    req.user = { id: decoded.userId }
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}

/**
 * Middleware providing optional JWT authentication for flexible endpoints.
 * Attempts token verification but continues execution regardless of token validity.
 * Sets user context if valid token provided, undefined otherwise.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = { id: decoded.userId }
    } catch (error) {
      // Invalid token - continue without authentication context
      req.user = undefined
    }
  }

  next()
}
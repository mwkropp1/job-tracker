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
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  // Handle missing headers object
  if (!req.headers) {
    res.status(401).json({ message: 'Access token required' })
    return
  }

  const authHeader = req.headers.authorization

  // Validate authHeader is a string
  if (typeof authHeader !== 'string') {
    res.status(401).json({ message: 'Access token required' })
    return
  }

  // Handle case-insensitive Bearer keyword with multiple spaces
  const parts = authHeader.trim().split(/\s+/)
  const token = parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' ? parts[1] : null

  if (!token) {
    res.status(401).json({ message: 'Access token required' })
    return
  }

  try {
    const decoded = verifyToken(token)
    req.user = { id: decoded.userId }
    next()
  } catch (error) {
    // Ensure user is undefined on failure
    delete req.user
    res.status(403).json({ message: 'Invalid or expired token' })
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
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  // Handle missing headers object
  if (!req.headers) {
    next()
    return
  }

  const authHeader = req.headers.authorization

  // Validate authHeader is a string and extract token
  if (typeof authHeader === 'string') {
    const parts = authHeader.trim().split(/\s+/)
    const token = parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' ? parts[1] : null

    if (token) {
      try {
        const decoded = verifyToken(token)
        req.user = { id: decoded.userId }
      } catch (error) {
        // Invalid token - continue without authentication context
        delete req.user
      }
    }
  }

  next()
}

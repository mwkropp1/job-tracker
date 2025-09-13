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

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

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

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = { id: decoded.userId }
    } catch (error) {
      // Token is invalid, but we continue without authentication
      req.user = undefined
    }
  }

  next()
}
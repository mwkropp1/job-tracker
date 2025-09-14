/**
 * Authentication utilities providing secure password hashing and JWT token management.
 * Implements bcrypt for password security and JWT for stateless authentication.
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// bcrypt salt rounds for password hashing - balances security and performance
const SALT_ROUNDS = 10

/**
 * Hashes a plaintext password using bcrypt with configurable salt rounds.
 * Uses industry-standard bcrypt algorithm resistant to rainbow table attacks.
 *
 * @param password Plaintext password to hash
 * @returns Promise resolving to bcrypt hash string
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compares plaintext password against stored bcrypt hash.
 * Implements constant-time comparison to prevent timing attacks.
 *
 * @param password Plaintext password to verify
 * @param hash Stored bcrypt hash for comparison
 * @returns Promise resolving to boolean indicating match status
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

/**
 * Generates JWT access token for authenticated user sessions.
 * Token expires in 24 hours and includes user identifier in payload.
 *
 * @param userId Unique user identifier to embed in token
 * @returns Signed JWT token string
 * @throws Error if JWT_SECRET environment variable is not configured
 */
export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  
  return jwt.sign({ userId }, secret, { expiresIn: '24h' })
}

/**
 * Verifies and decodes JWT token, extracting user information.
 * Validates token signature and expiration timestamp.
 *
 * @param token JWT token string to verify
 * @returns Decoded token payload containing user ID
 * @throws Error if token is invalid, expired, or JWT_SECRET is missing
 */
export const verifyToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  
  try {
    const decoded = jwt.verify(token, secret) as { userId: string }
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 10

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  
  return jwt.sign({ userId }, secret, { expiresIn: '24h' })
}

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
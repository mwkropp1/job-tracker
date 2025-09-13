import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { UserRepository } from '../repositories/UserRepository'
import { hashPassword, comparePassword, generateToken } from '../utils/auth'
import { validationResult } from 'express-validator'

export class AuthController {
  private userRepository: UserRepository

  constructor() {
    this.userRepository = new UserRepository(AppDataSource)
  }

  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { email, password, firstName, lastName } = req.body

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({
          message: 'User with this email already exists'
        })
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user
      const user = await this.userRepository.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName
      })

      // Generate token
      const token = generateToken(user.id)

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user
      
      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
        token
      })
    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({
        message: 'Error registering user',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { email, password } = req.body

      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          message: 'Invalid email or password'
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          message: 'Account is deactivated'
        })
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({
          message: 'Invalid email or password'
        })
      }

      // Generate token
      const token = generateToken(user.id)

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user

      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({
        message: 'Error logging in',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'User not authenticated'
        })
      }

      const user = await this.userRepository.findById(req.user.id)
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        })
      }

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user

      res.json({
        user: userWithoutPassword
      })
    } catch (error) {
      console.error('Get profile error:', error)
      res.status(500).json({
        message: 'Error fetching user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
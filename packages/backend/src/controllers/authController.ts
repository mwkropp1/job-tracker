import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { DataSource } from 'typeorm'

import { AppDataSource } from '../config/database'
import { UserRepository } from '../repositories/UserRepository'
import { hashPassword, comparePassword, generateToken } from '../utils/auth'

/**
 * Handles user authentication operations including registration, login, and profile retrieval.
 * Implements JWT-based authentication with secure password hashing.
 */
export class AuthController {
  private userRepository: UserRepository

  constructor(dataSource?: DataSource) {
    const dbSource = dataSource || AppDataSource
    this.userRepository = new UserRepository(dbSource)
  }

  /**
   * Registers a new user account with email validation and password hashing.
   * Prevents duplicate email registrations and returns JWT token upon success.
   *
   * @param req Express request with user registration data
   * @param res Express response with user data and authentication token
   */
  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const { email, password, firstName, lastName } = req.body

      const existingUser = await this.userRepository.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({
          message: 'User with this email already exists',
        })
      }

      const hashedPassword = await hashPassword(password)

      const user = await this.userRepository.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      })

      const token = generateToken(user.id)

      // Exclude password from response for security
      const { password: _, ...userWithoutPassword } = user

      return res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
        token,
      })
    } catch (error) {
      console.error('Registration error:', error)
      return res.status(500).json({
        message: 'Error registering user',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Authenticates user with email and password, returning JWT token on success.
   * Verifies account status and implements secure password comparison.
   *
   * @param req Express request with login credentials
   * @param res Express response with user data and authentication token
   */
  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        })
      }

      const { email, password } = req.body

      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          message: 'Invalid email or password',
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          message: 'Account is deactivated',
        })
      }

      const isValidPassword = await comparePassword(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({
          message: 'Invalid email or password',
        })
      }

      const token = generateToken(user.id)

      // Exclude password from response for security
      const { password: _, ...userWithoutPassword } = user

      return res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token,
      })
    } catch (error) {
      console.error('Login error:', error)
      return res.status(500).json({
        message: 'Error logging in',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Retrieves authenticated user's profile information.
   * Requires valid JWT authentication via middleware.
   *
   * @param req Express request with authenticated user context
   * @param res Express response with user profile data
   */
  async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'User not authenticated',
        })
      }

      const user = await this.userRepository.findById(req.user.id)
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      // Exclude password from response for security
      const { password: _, ...userWithoutPassword } = user

      return res.json({
        user: userWithoutPassword,
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({
        message: 'Error fetching user profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}

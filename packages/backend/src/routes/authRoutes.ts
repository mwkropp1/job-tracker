/**
 * Authentication routes providing user registration, login, and profile access.
 * Implements comprehensive input validation and secure password requirements.
 */

import { Router, Request, Response } from 'express'
import { body } from 'express-validator'

import { AuthController } from '../controllers/authController'
import { authenticateToken } from '../middleware/auth'

const router = Router()
const authController = new AuthController()

// Input validation for user registration with security requirements
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
]

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// Authentication endpoint definitions with validation middleware
router.post('/register', registerValidation, (req: Request, res: Response) => authController.register(req, res))
router.post('/login', loginValidation, (req: Request, res: Response) => authController.login(req, res))
router.get('/profile', authenticateToken, (req: Request, res: Response) => authController.getProfile(req, res))

export default router
import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { generateToken } from '../utils/auth';
import { RegisterRequest, LoginRequest } from '../types';

const router = Router();
const userService = new UserService();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password }: RegisterRequest = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await userService.createUser({ name, email, password });
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      token,
      user: userService.getUserResponse(user),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user',
    });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required',
      });
    }

    const user = await userService.verifyLogin(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: userService.getUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login',
    });
  }
});

export default router;


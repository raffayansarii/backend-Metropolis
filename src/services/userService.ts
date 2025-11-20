import { User, UserResponse, RegisterRequest } from '../types';
import { hashPassword, comparePassword } from '../utils/auth';
import * as fs from 'fs';
import * as path from 'path';

const DB_FILE = path.join(__dirname, '../../data/users.json');
const DB_DIR = path.dirname(DB_FILE);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize with default users if file doesn't exist
const initializeUsers = async (): Promise<Record<number, User>> => {
  if (!fs.existsSync(DB_FILE)) {
    const { hashPassword } = require('../utils/auth');
    // Hash the default password for all default users
    const hashedPassword = await hashPassword('password123');
    
    const defaultUsers: Record<number, User> = {
      1: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      },
      2: {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      },
      3: {
        id: 3,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  return {};
};

// Load users from file
const loadUsers = async (): Promise<Record<number, User>> => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const users = JSON.parse(data);
      // Ensure all users have properly hashed passwords
      const { hashPassword } = require('../utils/auth');
      let needsUpdate = false;
      for (const [id, user] of Object.entries(users)) {
        const u = user as User;
        if (!u.password || u.password.length < 50) {
          // Password not hashed or invalid hash
          u.password = await hashPassword('password123');
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
      }
      return users;
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return await initializeUsers();
};

// Save users to file
const saveUsers = (users: Record<number, User>): void => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Simulate database delay
const DB_DELAY_MS = 200;

export class UserService {
  private users: Record<number, User>;
  private pendingRequests = new Map<number, Promise<User>>();
  private initialized: Promise<void>;

  constructor() {
    // Initialize users asynchronously
    this.users = {};
    this.initialized = this.init();
  }

  private async init(): Promise<void> {
    this.users = await loadUsers();
  }

  // Ensure service is initialized before use
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  async getUserById(id: number): Promise<User | null> {
    await this.ensureInitialized();
    
    if (this.pendingRequests.has(id)) {
      return this.pendingRequests.get(id)!;
    }

    const fetchPromise = new Promise<User>((resolve, reject) => {
      setTimeout(() => {
        const user = this.users[id];
        if (user) {
          resolve(user);
        } else {
          reject(new Error('User not found'));
        }
        this.pendingRequests.delete(id);
      }, DB_DELAY_MS);
    });

    this.pendingRequests.set(id, fetchPromise);

    try {
      return await fetchPromise;
    } catch (error) {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = Object.values(this.users).find((u) => u.email === email);
        resolve(user || null);
      }, DB_DELAY_MS);
    });
  }

  async createUser(data: RegisterRequest): Promise<User> {
    await this.ensureInitialized();
    
    // Check if email already exists
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const id = Math.max(0, ...Object.keys(this.users).map(Number)) + 1;
    const hashedPassword = await hashPassword(data.password);

    const newUser: User = {
      id,
      name: data.name,
      email: data.email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    this.users[id] = newUser;
    saveUsers(this.users);

    // Remove password before returning
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  }

  async verifyLogin(email: string, password: string): Promise<User | null> {
    await this.ensureInitialized();
    
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Remove password before returning
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getAllUsers(): Promise<UserResponse[]> {
    await this.ensureInitialized();
    
    return Object.values(this.users).map(({ password, ...user }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }));
  }

  getUserResponse(user: User): UserResponse {
    const { password, ...userResponse } = user;
    return userResponse;
  }
}

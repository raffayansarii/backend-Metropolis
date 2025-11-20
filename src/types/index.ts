export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // Hashed password, not returned in API responses
  createdAt?: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  averageResponseTime: number;
}

export interface CacheEntry {
  data: User;
  timestamp: number;
}


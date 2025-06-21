import fs from 'fs/promises';
import path from 'path';

// Check if we're running in a serverless environment (Vercel)
const isServerless = process.env.VERCEL || !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

// Define the path to the users.json file (only used in local development)
const usersFilePath = path.join(process.cwd(), 'users.json');

// In-memory storage for serverless environments
let memoryUsers: UserData = {};

// Define the User type
export interface User {
  id: string;
  username: string;
  name?: string;
  surname?: string;
  email: string;
  password?: string; // It's good practice to not expose the password hash
}

type UserData = Record<string, Omit<User, 'id'> & { password?: string }>;

/**
 * Reads and parses the users data.
 */
export async function readUsers(): Promise<UserData> {
  if (isServerless) {
    // Use in-memory storage for serverless environments
    return memoryUsers;
  }
  
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty object
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn('Users file not found, creating empty users store');
      return {};
    }
    console.error("Failed to read users file:", error);
    throw error;
  }
}

/**
 * Writes data to the users storage.
 */
export async function writeUsers(data: UserData): Promise<void> {
  if (isServerless) {
    // Use in-memory storage for serverless environments
    memoryUsers = { ...data };
    return;
  }
  
  try {
    // Ensure the directory exists
    const dir = path.dirname(usersFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write users file:", error);
    throw error;
  }
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Validates username format
 */
export function isValidUsername(username: string): boolean {
  return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
}

// Ensure the file exists
async function ensureFileExists() {
  // ... existing code ...
} 
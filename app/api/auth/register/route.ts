import { NextRequest, NextResponse } from 'next/server';
import { readUsers, writeUsers, User, isValidEmail, isValidPassword, isValidUsername } from '../../../../lib/user-store';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development';

export async function POST(request: NextRequest) {
  console.log('🔐 Register API called');
  
  try {
    const body = await request.json();
    const { email, password, username } = body;
    
    console.log('📝 Registration attempt:', { email, username, hasPassword: !!password });
    
    // Input validation
    if (!email || !password || !username) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      console.log('❌ Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      console.log('❌ Password too weak');
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!isValidUsername(username)) {
      console.log('❌ Invalid username format:', username);
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    console.log('✅ Input validation passed');

    const users = await readUsers();
    console.log('📖 Loaded users from storage');

    // Check if email is already taken
    const emailExists = Object.values(users).some((user: any) => user.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      console.log('❌ Email already exists:', email);
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Check if username is already taken
    const usernameExists = Object.values(users).some((user: any) => user.username.toLowerCase() === username.toLowerCase());
    if (usernameExists) {
      console.log('❌ Username already exists:', username);
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    console.log('✅ User uniqueness check passed');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔒 Password hashed successfully');
    
    // Generate new user ID
    const newUserId = (Object.keys(users).length + 1).toString();
    
    const newUser: Omit<User, 'id'> & { password: string } = {
      email: email.toLowerCase(),
      password: hashedPassword,
      username: username.toLowerCase(),
      name: username, // Default name to username
      surname: '',
    };

    const updatedUsers = { ...users, [newUserId]: newUser };
    await writeUsers(updatedUsers);
    console.log('💾 User saved to storage');

    const userForToken: User = {
      id: newUserId,
      email: newUser.email,
      username: newUser.username,
      name: newUser.name,
      surname: newUser.surname,
    };

    // Create JWT token
    const token = sign({ userId: userForToken.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('🎫 JWT token created');
    
    // Create response with secure cookie
    const response = NextResponse.json(userForToken, { status: 201 });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 604800, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    console.log('✅ Registration successful for user:', userForToken.username);
    return response;

  } catch (error) {
    console.error('💥 Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
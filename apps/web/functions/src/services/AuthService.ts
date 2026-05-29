import type { D1Database } from '@cloudflare/workers-types';
import { hashPassword, verifyPassword } from '@/utils/auth';
import { AuthRepository } from '@/repositories/AuthRepository';
import { User } from '@/types/auth';
import { bruteForceDetector } from '@/utils/anomalyDetection';

export class AuthService {
  private authRepository: AuthRepository;

  constructor(db: D1Database) {
    this.authRepository = new AuthRepository(db);
  }

  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'> } | null> {
    const user = await this.authRepository.findByEmail(email);
    const ip = 'unknown'; // In a real implementation, we'd get this from the request context
    
    // Record the login attempt for anomaly detection (before verification so we capture failed attempts)
    const loginAttempt = await verifyPassword(password, user?.password_hash ?? '');
    bruteForceDetector.recordAttempt(ip, email, loginAttempt);
    
    if (!user || !loginAttempt) {
      return null;
    }

    // In a real implementation, we would generate a JWT token here
    // For now, we'll return the user data without the password hash
    const { password_hash, ...userWithoutPassword } = user;
    return {
      token: 'mock-token', // This would be replaced with actual JWT generation
      user: userWithoutPassword as Omit<User, 'password_hash'>
    };
  }

  async validateUser(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.authRepository.findById(id);

    if (!user) return null;

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password_hash'>;
  }

  async seedInitialUsers(): Promise<{ message: string; users: Array<{ email: string; role: string }> }> {
    return await this.authRepository.seedInitialUsers();
  }
}
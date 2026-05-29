import { securityLogger } from './logger';

interface AccessAttempt {
  timestamp: number;
  ip: string;
  email?: string;
  success: boolean;
  userAgent?: string;
}

interface AnomalyDetector {
  store: Map<string, AccessAttempt[]>;
  windowMs: number;
  threshold: number;
  
  recordAttempt(ip: string, email: string | undefined, success: boolean, userAgent?: string): void;
  detectAnomalies(ip: string, email?: string): { isAnomalous: boolean; reason?: string };
  cleanup(): void;
}

export class BruteForceDetector implements AnomalyDetector {
  private store: Map<string, AccessAttempt[]>;
  private windowMs: number;
  private threshold: number; // failed attempts threshold
  
  constructor(windowMs: number = 15 * 60 * 1000, threshold: number = 5) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.threshold = threshold;
  }
  
  private getKey(ip: string, email?: string): string {
    return email ? `${ip}:${email}` : ip;
  }
  
  recordAttempt(ip: string, email: string | undefined, success: boolean, userAgent?: string): void {
    const key = this.getKey(ip, email);
    const attempt: AccessAttempt = {
      timestamp: Date.now(),
      ip,
      email,
      success,
      userAgent
    };
    
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    
    const attempts = this.store.get(key)!;
    attempts.push(attempt);
    
    // Clean old attempts outside the window
    const cutoff = Date.now() - this.windowMs;
    const validAttempts = attempts.filter(attempt => attempt.timestamp >= cutoff);
    this.store.set(key, validAttempts);
    
    // Log for monitoring
    if (!success) {
      securityLogger.warn('Failed login attempt recorded for anomaly detection', {
        ip,
        email: email || 'unknown',
        userAgent,
        failedAttemptsInWindow: validAttempts.filter(a => !a.success).length
      });
    }
  }
  
  detectAnomalies(ip: string, email?: string): { isAnomalous: boolean; reason?: string } {
    const key = this.getKey(ip, email);
    const attempts = this.store.get(key) || [];
    
    const cutoff = Date.now() - this.windowMs;
    const recentAttempts = attempts.filter(attempt => attempt.timestamp >= cutoff);
    
    // Check for brute force: too many failed attempts
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    if (failedAttempts.length >= this.threshold) {
      return {
        isAnomalous: true,
        reason: `Brute force detected: ${failedAttempts.length} failed attempts in ${this.windowMs/1000/60} minutes`
      };
    }
    
    // Check for credential stuffing: many different emails from same IP
    if (email) {
      const uniqueEmails = new Set(recentAttempts.map(attempt => attempt.email).filter((e): e is string => e !== undefined));
      if (uniqueEmails.size > 10) { // More than 10 different emails from same IP
        return {
          isAnomalous: true,
          reason: `Credential stuffing detected: ${uniqueEmails.size} different emails attempted from this IP`
        };
      }
    }
    
    // Check for impossible travel: same account from vastly different IPs in short time
    // This would require storing per-account data - simplified version here
    
    return { isAnomalous: false };
  }
  
  cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, attempts] of this.store.entries()) {
      const validAttempts = attempts.filter(attempt => attempt.timestamp >= cutoff);
      if (validAttempts.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, validAttempts);
      }
    }
  }
}

// Global detector instance
export const bruteForceDetector = new BruteForceDetector();
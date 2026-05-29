import { Hono } from 'hono';
import type { JWTVariables } from 'hono/jwt';

// Enhanced in-memory store for rate limiting (in production, use Redis or similar)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function rateLimit(options: {
  windowMs: number; // window in milliseconds
  maxRequests: number; // max requests per window
  keyGenerator?: (c: any) => string; // function to generate key from context
}) {
  return async function rateLimitMiddleware(c: any, next: () => Promise<any>) {
    const { windowMs, maxRequests, keyGenerator } = options;
    
    // Default key generator uses IP address
    const generateKey = keyGenerator || ((c: any) => c.req.ip());
    
    const key = generateKey(c);
    const now = Date.now();
    
    // Initialize or cleanup expired entries
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      rateLimitStore[key].count++;
      
      // Check if limit exceeded
      if (rateLimitStore[key].count > maxRequests) {
        return c.json(
          { error: 'Muitas tentativas. Por favor, tente novamente mais tarde.' },
          429
        );
      }
    }
    
    await next();
  };
}

/**
 * Sophisticated rate limiting that combines IP and account-based limits
 * Prevents both brute force attacks and account targeting
 */
export function sophisticatedRateLimit(options: {
  windowMs: number; // window in milliseconds
  maxRequestsPerIP: number; // max requests per IP per window
  maxRequestsPerAccount: number; // max requests per account per window
}) {
  return async function sophisticatedRateLimitMiddleware(c: any, next: () => Promise<any>) {
    const { windowMs, maxRequestsPerIP, maxRequestsPerAccount } = options;
    const now = Date.now();
    
    // Generate keys for IP-based and account-based limiting
    const ipKey = `ip:${c.req.ip()}`;
    
    // Try to get account identifier from JWT payload if available
    let accountKey = '';
    try {
      const payload = c.get('jwtPayload');
      if (payload && payload.email) {
        accountKey = `account:${payload.email}`;
      }
    } catch (e) {
      // No JWT or invalid token - skip account-based limiting
    }
    
    // Check IP-based limit
    if (!rateLimitStore[ipKey] || rateLimitStore[ipKey].resetTime < now) {
      rateLimitStore[ipKey] = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      rateLimitStore[ipKey].count++;
      
      if (rateLimitStore[ipKey].count > maxRequestsPerIP) {
        return c.json(
          { error: 'Muitas tentativas deste IP. Por favor, tente novamente mais tarde.' },
          429
        );
      }
    }
    
    // Check account-based limit if we have an account identifier
    if (accountKey) {
      if (!rateLimitStore[accountKey] || rateLimitStore[accountKey].resetTime < now) {
        rateLimitStore[accountKey] = {
          count: 1,
          resetTime: now + windowMs,
        };
      } else {
        rateLimitStore[accountKey].count++;
        
        if (rateLimitStore[accountKey].count > maxRequestsPerAccount) {
          return c.json(
            { error: 'Muitas tentativas nesta conta. Por favor, tente novamente mais tarde.' },
            429
          );
        }
      }
    }
    
    await next();
  };
}
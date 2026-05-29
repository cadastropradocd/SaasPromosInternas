import type { D1Database } from '@cloudflare/workers-types';
import { hashPassword } from '@/utils/auth';

export class AuthRepository {
  constructor(private db: D1Database) {}

  async findByEmail(email: string) {
    return await this.db.prepare(
      'SELECT * FROM users WHERE email = ? AND active = 1 AND deleted_at IS NULL'
    )
    .bind(email)
    .first() as { 
      id: string; 
      name: string; 
      email: string; 
      password_hash: string; 
      role: string 
    } | undefined;
  }

  async findById(id: string) {
    return await this.db.prepare(
      'SELECT * FROM users WHERE id = ? AND active = 1 AND deleted_at IS NULL'
    )
    .bind(id)
    .first() as {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: string;
    } | undefined;
  }

  async seedInitialUsers() {
    const existing = await this.db.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
    .bind('admin@prado.com')
    .first();

    if (existing) {
      return { message: 'Seed already exists', users: [] };
    }

    const users = [
      { id: '1', name: 'Administrador', email: 'admin@prado.com', password: 'admin123', role: 'ADMIN' },
      { id: '2', name: 'Gestor de Promoções', email: 'gestor@prado.com', password: 'gestor123', role: 'GESTOR' },
      { id: '3', name: 'Comprador', email: 'comprador@prado.com', password: 'comprador123', role: 'COMPRADOR' },
    ];

    for (const u of users) {
      await this.db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(u.id, u.name, u.email, await hashPassword(u.password), u.role)
      .run();
    }

    return {
      message: 'Seed completed',
      users: users.map(u => ({ email: u.email, role: u.role }))
    };
  }
}
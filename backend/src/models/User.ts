import { pool } from '../config/database';
import { User, CreateUserRequest } from '../types/user';
import { hashPassword } from '../utils/password';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    const { email, password, first_name, last_name } = userData;
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, balance, created_at, updated_at
    `;
    
    const values = [email, passwordHash, first_name, last_name];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email with password hash (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update user balance
   */
  static async updateBalance(id: number, newBalance: number): Promise<User | null> {
    const query = `
      UPDATE users 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, balance, created_at, updated_at
    `;
    
    const result = await pool.query(query, [newBalance, id]);
    return result.rows[0] || null;
  }
}
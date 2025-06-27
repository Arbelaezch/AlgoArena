import { pool } from '../config/database';
import { User, CreateUserRequest } from '../types/user';
import { hashPassword } from '../utils/password';
import { userChanged } from '../events/userEvents';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    const { email, password, username, first_name, last_name } = userData;
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    
    const query = `
      INSERT INTO users (email, username, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, first_name, last_name, balance, created_at, updated_at
    `;
    
    const values = [email, username, passwordHash, first_name, last_name];
    
    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];
      
      // Emit user changed event (cache will be populated on first access)
      userChanged(user.id);
      
      return user;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint?.includes('email')) {
          throw new Error('User with this email already exists');
        }
        if (error.constraint?.includes('username')) {
          throw new Error('Username is already taken');
        }
        throw new Error('User with this email or username already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE username = $1
    `;
    
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email or username
   */
  static async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1 OR username = $1
    `;
    
    const result = await pool.query(query, [identifier]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email with password hash (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email or username with password hash (for authentication)
   */
  static async findByEmailOrUsernameWithPassword(identifier: string): Promise<(User & { password_hash: string }) | null> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE email = $1 OR username = $1
    `;
    
    const result = await pool.query(query, [identifier]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, balance, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const query = `SELECT 1 FROM users WHERE email = $1 LIMIT 1`;
    const result = await pool.query(query, [email]);
    return result.rows.length > 0;
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const query = `SELECT 1 FROM users WHERE username = $1 LIMIT 1`;
    const result = await pool.query(query, [username]);
    return result.rows.length > 0;
  }

  /**
   * Update user balance
   */
  static async updateBalance(id: number, newBalance: number): Promise<User | null> {
    const query = `
      UPDATE users 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, username, first_name, last_name, balance, created_at, updated_at
    `;
    
    const result = await pool.query(query, [newBalance, id]);
    const user = result.rows[0] || null;
    
    // Emit user changed event if update was successful
    if (user) {
      userChanged(id);
    }
    
    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(id: number, data: {
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<User | null> {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }
    if (data.first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      values.push(data.last_name);
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, username, first_name, last_name, balance, created_at, updated_at
    `;

    try {
      const result = await pool.query(query, values);
      const user = result.rows[0] || null;
      
      // Emit user changed event if update was successful
      if (user) {
        userChanged(id);
      }
      
      return user;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint?.includes('email')) {
          throw new Error('Email is already taken');
        }
        if (error.constraint?.includes('username')) {
          throw new Error('Username is already taken');
        }
        throw new Error('Email or username is already taken');
      }
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const passwordHash = await hashPassword(newPassword);
    
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await pool.query(query, [passwordHash, id]);
    const success = (result.rowCount ?? 0) > 0;
    
    // Emit user changed event if update was successful
    if (success) {
      userChanged(id);
    }
    
    return success;
  }

  /**
   * Delete user
   */
  static async deleteById(id: number): Promise<boolean> {
    const query = `DELETE FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    const success = (result.rowCount ?? 0) > 0;
    
    // Emit user changed event if deletion was successful
    if (success) {
      userChanged(id);
    }
    
    return success;
  }

  /**
   * Get user statistics (for admin/analytics)
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    usersToday: number;
    usersThisWeek: number;
    usersThisMonth: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as users_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as users_this_month
      FROM users
    `;
    
    const result = await pool.query(query);
    const stats = result.rows[0];
    
    return {
      totalUsers: parseInt(stats.total_users),
      usersToday: parseInt(stats.users_today),
      usersThisWeek: parseInt(stats.users_this_week),
      usersThisMonth: parseInt(stats.users_this_month),
    };
  }
}
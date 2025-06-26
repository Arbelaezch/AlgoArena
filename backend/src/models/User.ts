import { pool } from '../config/database';
import { User, CreateUserRequest } from '../types/user';
import { hashPassword } from '../utils/password';
import { userChanged } from '../events/userEvents';

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
      const user = result.rows[0];
      
      // Emit user changed event (cache will be populated on first access)
      userChanged(user.id);
      
      return user;
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
      RETURNING id, email, first_name, last_name, balance, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const user = result.rows[0] || null;
    
    // Emit user changed event if update was successful
    if (user) {
      userChanged(id);
    }
    
    return user;
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
}
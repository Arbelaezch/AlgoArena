import { pool, query, queryOne, queryMany, queryExists, withTransaction } from '../config/database';
import { UserEntity, CreateUserRequest } from '../types/user';
import { hashPassword } from '../utils/password';
import { userChanged } from '../events/userEvents';

// Field constants for reusable SELECT clauses
const USER_FIELDS = 'id, email, username, first_name, last_name, balance, created_at, updated_at';
const USER_FIELDS_WITH_PASSWORD = 'id, email, username, password_hash, first_name, last_name, balance, created_at, updated_at';
const USER_RETURNING_FIELDS = 'id, email, username, first_name, last_name, balance, created_at, updated_at';

export class User {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<UserEntity> {
    const { email, password, username, first_name, last_name } = userData;
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    
    const sql = `
      INSERT INTO users (email, username, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${USER_RETURNING_FIELDS}
    `;
    
    const values = [email, username, passwordHash, first_name, last_name];
    
    try {
      const user = await queryOne<UserEntity>(sql, values);
      if (!user) {
        throw new Error('Failed to create user');
      }
      
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
  static async findByEmail(email: string): Promise<UserEntity | null> {
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE email = $1
    `;
    
    return queryOne<UserEntity>(sql, [email]);
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<UserEntity | null> {
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE username = $1
    `;
    
    return queryOne<UserEntity>(sql, [username]);
  }

  /**
   * Find user by email or username
   */
  static async findByEmailOrUsername(identifier: string): Promise<UserEntity | null> {
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE email = $1 OR username = $1
    `;
    
    return queryOne<UserEntity>(sql, [identifier]);
  }

  /**
   * Find user by email with password hash (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<(UserEntity & { password_hash: string }) | null> {
    const sql = `
      SELECT ${USER_FIELDS_WITH_PASSWORD}
      FROM users 
      WHERE email = $1
    `;
    
    return queryOne<UserEntity & { password_hash: string }>(sql, [email]);
  }

  /**
   * Find user by email or username with password hash (for authentication)
   */
  static async findByEmailOrUsernameWithPassword(identifier: string): Promise<(UserEntity & { password_hash: string }) | null> {
    const sql = `
      SELECT ${USER_FIELDS_WITH_PASSWORD}
      FROM users 
      WHERE email = $1 OR username = $1
    `;
    
    return queryOne<UserEntity & { password_hash: string }>(sql, [identifier]);
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<UserEntity | null> {
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE id = $1
    `;
    
    return queryOne<UserEntity>(sql, [id]);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const sql = `SELECT 1 FROM users WHERE email = $1 LIMIT 1`;
    return queryExists(sql, [email]);
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const sql = `SELECT 1 FROM users WHERE username = $1 LIMIT 1`;
    return queryExists(sql, [username]);
  }

  /**
   * Update user balance
   */
  static async updateBalance(id: number, newBalance: number): Promise<UserEntity | null> {
    const sql = `
      UPDATE users 
      SET balance = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING ${USER_RETURNING_FIELDS}
    `;
    
    const user = await queryOne<UserEntity>(sql, [newBalance, id]);
    
    // Emit user changed event if update was successful
    if (user) {
      userChanged(id);
    }
    
    return user;
  }

  /**
   * Update user profile - Now with dynamic field building!
   */
  static async updateProfile(id: number, data: Partial<Pick<UserEntity, 'email' | 'username' | 'first_name' | 'last_name'>>): Promise<UserEntity | null> {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Dynamically build query for any provided field
    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING ${USER_RETURNING_FIELDS}
    `;

    try {
      const user = await queryOne<UserEntity>(sql, values);
      
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
    
    const sql = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await query(sql, [passwordHash, id]);
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
    const sql = `DELETE FROM users WHERE id = $1`;
    const result = await query(sql, [id]);
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
    const sql = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as users_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as users_this_month
      FROM users
    `;
    
    const stats = await queryOne<{
      total_users: string;
      users_today: string;
      users_this_week: string;
      users_this_month: string;
    }>(sql);
    
    if (!stats) {
      return {
        totalUsers: 0,
        usersToday: 0,
        usersThisWeek: 0,
        usersThisMonth: 0,
      };
    }
    
    return {
      totalUsers: parseInt(stats.total_users),
      usersToday: parseInt(stats.users_today),
      usersThisWeek: parseInt(stats.users_this_week),
      usersThisMonth: parseInt(stats.users_this_month),
    };
  }

  /**
   * Get all users with pagination (for admin)
   */
  static async findAll(page = 1, limit = 10): Promise<{ users: UserEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    
    // Get users
    const usersSql = `
      SELECT ${USER_FIELDS}
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const users = await queryMany<UserEntity>(usersSql, [limit, offset]);
    
    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM users';
    const countResult = await queryOne<{ total: string }>(countSql);
    const total = parseInt(countResult?.total || '0');
    
    return { users, total };
  }

  /**
   * Search users by name, email, or username
   */
  static async search(searchTerm: string, page = 1, limit = 10): Promise<UserEntity[]> {
    const offset = (page - 1) * limit;
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE 
        LOWER(email) LIKE $1 OR 
        LOWER(username) LIKE $1 OR 
        LOWER(first_name) LIKE $1 OR 
        LOWER(last_name) LIKE $1 OR
        LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    return queryMany<UserEntity>(sql, [searchPattern, limit, offset]);
  }

  /**
   * Bulk update user balances (for transactions)
   */
  static async updateBalances(updates: Array<{ id: number; balance: number }>): Promise<void> {
    if (updates.length === 0) return;

    await withTransaction(async (client) => {
      for (const update of updates) {
        await client.query(
          'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [update.balance, update.id]
        );
        userChanged(update.id);
      }
    });
  }

  /**
   * Get users with low balance (for notifications)
   */
  static async getUsersWithLowBalance(threshold = 10): Promise<UserEntity[]> {
    const sql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE balance < $1
      ORDER BY balance ASC
    `;
    
    return queryMany<UserEntity>(sql, [threshold]);
  }

  /**
   * Verify user credentials (for login)
   */
  static async verifyCredentials(identifier: string, password: string): Promise<UserEntity | null> {
    const userWithPassword = await this.findByEmailOrUsernameWithPassword(identifier);
    if (!userWithPassword) {
      return null;
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, userWithPassword.password_hash);
    if (!isValid) {
      return null;
    }

    // Return user without password
    const { password_hash, ...user } = userWithPassword;
    return user;
  }
}
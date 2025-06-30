import { pool, query, queryOne, queryMany, queryExists, withTransaction } from '../config/database.js';
import { UserEntity, CreateUserRequest, UserRole } from '../types/user.js';
import { hashPassword } from '../utils/password.js';
import { userChanged } from '../events/userEvents.js';

// Field constants for reusable SELECT clauses
const USER_FIELDS = 'id, email, username, first_name, last_name, balance, role, created_at, updated_at';
const USER_FIELDS_WITH_PASSWORD = 'id, email, username, password_hash, first_name, last_name, balance, role, created_at, updated_at';
const USER_RETURNING_FIELDS = 'id, email, username, first_name, last_name, balance, role, created_at, updated_at';

export class User {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<UserEntity> {
    const { email, password, username, first_name, last_name, role = 'user' } = userData;
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    
    const sql = `
      INSERT INTO users (email, username, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${USER_RETURNING_FIELDS}
    `;
    
    const values = [email, username, passwordHash, first_name, last_name, role];
    
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
   * Update user role (admin function)
   */
  static async updateRole(id: number, newRole: UserRole): Promise<UserEntity | null> {
    const sql = `
      UPDATE users 
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING ${USER_RETURNING_FIELDS}
    `;
    
    const user = await queryOne<UserEntity>(sql, [newRole, id]);
    
    // Emit user changed event if update was successful
    if (user) {
      userChanged(id);
    }
    
    return user;
  }

  /**
   * Update user profile - Now with dynamic field building!
   */
  static async updateProfile(id: number, data: Partial<Pick<UserEntity, 'email' | 'username' | 'first_name' | 'last_name' | 'role'>>): Promise<UserEntity | null> {
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
   * Get users by role
   */
  static async findByRole(role: UserRole, page = 1, limit = 10): Promise<{ users: UserEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    
    // Get users
    const usersSql = `
      SELECT ${USER_FIELDS}
      FROM users 
      WHERE role = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const users = await queryMany<UserEntity>(usersSql, [role, limit, offset]);
    
    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM users WHERE role = $1';
    const countResult = await queryOne<{ total: string }>(countSql, [role]);
    const total = parseInt(countResult?.total || '0');
    
    return { users, total };
  }

  /**
   * Get user statistics (for admin/analytics) - Enhanced with role breakdown
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    usersToday: number;
    usersThisWeek: number;
    usersThisMonth: number;
    roleBreakdown: Record<UserRole, number>;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as users_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as users_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as users_this_month,
        COUNT(*) FILTER (WHERE role = 'user') as role_user,
        COUNT(*) FILTER (WHERE role = 'admin') as role_admin,
        COUNT(*) FILTER (WHERE role = 'superadmin') as role_superadmin,
        COUNT(*) FILTER (WHERE role = 'moderator') as role_moderator
      FROM users
    `;
    
    const stats = await queryOne<{
      total_users: string;
      users_today: string;
      users_this_week: string;
      users_this_month: string;
      role_user: string;
      role_admin: string;
      role_superadmin: string;
      role_moderator: string;
    }>(sql);
    
    if (!stats) {
      return {
        totalUsers: 0,
        usersToday: 0,
        usersThisWeek: 0,
        usersThisMonth: 0,
        roleBreakdown: {
          user: 0,
          admin: 0,
          superadmin: 0,
          moderator: 0,
        },
      };
    }
    
    return {
      totalUsers: parseInt(stats.total_users),
      usersToday: parseInt(stats.users_today),
      usersThisWeek: parseInt(stats.users_this_week),
      usersThisMonth: parseInt(stats.users_this_month),
      roleBreakdown: {
        user: parseInt(stats.role_user),
        admin: parseInt(stats.role_admin),
        superadmin: parseInt(stats.role_superadmin),
        moderator: parseInt(stats.role_moderator),
      },
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
   * Search users by name, email, username, or role
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
        LOWER(CONCAT(first_name, ' ', last_name)) LIKE $1 OR
        LOWER(role::text) LIKE $1
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

  /**
   * Update last login time (useful for session tracking)
   */
  static async updateLastLogin(id: number): Promise<boolean> {
    const sql = `
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await query(sql, [id]);
    const success = (result.rowCount ?? 0) > 0;
    
    // Emit user changed event if update was successful
    if (success) {
      userChanged(id);
    }
    
    return success;
  }

  /**
   * Check if user has specific role or higher privileges
   */
  static hasRoleOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      'user': 1,
      'moderator': 2,
      'admin': 3,
      'superadmin': 4,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}
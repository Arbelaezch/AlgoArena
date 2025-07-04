export type UserRole = 'user' | 'admin' | 'superadmin' | 'moderator';

export interface UserEntity {
    id: number;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    location?: string;
    bio?: string;
    avatar?: string;
    balance: number;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
    password_hash?: string;
}
  
export interface CreateUserRequest {
    email: string;
    password: string;
    username: string;
    first_name?: string;
    last_name?: string;
    role?: UserRole; // Optional, defaults to 'user'
}

export interface UserProfile extends Omit<UserEntity, 'password_hash'> {}
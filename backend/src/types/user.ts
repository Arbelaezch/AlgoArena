export interface User {
    id: number;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    balance: number;
    created_at: Date;
    updated_at: Date;
    password_hash?: string;
}
  
export interface CreateUserRequest {
    email: string;
    password: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

export interface UserProfile extends Omit<User, 'password_hash'> {}

// Future user types might include:
// export interface UpdateUserRequest { ... }
// export interface UserPreferences { ... }
// export interface UserSettings { ... }
export interface User {
    id: number;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    balance: number;
    created_at: Date;
    updated_at: Date;
}
  
export interface CreateUserRequest {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
}

// export interface UpdateUserRequest { ... }
// export interface UserProfile { ... }
// export interface UserPreferences { ... }
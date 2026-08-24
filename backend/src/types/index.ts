export interface User {
    id: string;
    email: string;
    created_at: Date;
}

export interface UserWithPassword extends User {
    password_hash: string;
}

export interface Session {
    id: string;
    user_id: string;
    expires_at: Date;
}

export interface SessionWithUser {
    session_id: string;
    expires_at: Date;
    user_id: string;
    email: string;
    user_created_at: Date;
}

export type AppErrorCode = 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS';

export class AppError extends Error {
    code: AppErrorCode;
    constructor(message: string, code: AppErrorCode) {
        super(message);
        this.code = code;
    }
}
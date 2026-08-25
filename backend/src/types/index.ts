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

export type AppErrorCode = 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS'| 'NOT_FOUND';

export class AppError extends Error {
    code: AppErrorCode;
    constructor(message: string, code: AppErrorCode) {
        super(message);
        this.code = code;
    }
}

export const PANTRY_CATEGORIES = [
    'vegetables',
    'protein',
    'grains',
    'condiments',
    'frozen',
    'dairy',
    'other',
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export interface PantryItem {
    id: string;
    user_id: string;
    name: string;
    category: PantryCategory;
    quantity: string | null;
    unit: string | null;
    expires_on: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface PantryItemInput {
    name: string;
    category: PantryCategory;
    quantity: number | null;
    unit: string | null;
    expires_on: string | null;
}

export type PantryItemPatch = Partial<PantryItemInput>;
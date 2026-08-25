const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
            super(message);
            this.status = status;
        }
    }

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        // After the spread, so a caller cannot accidentally drop it. Without this
        // the browser neither sends nor stores the session cookie, and every
        // request after login comes back 401.
        credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        },
    });
    if (!response.ok) {
    // A 500 can return HTML, in which case json() throws and the real status
    // code would be lost. Swallow that and fall back to a generic message.
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status);
    }

    // 204 No Content has no body at all; json() would throw on an empty stream.
    if (response.status === 204) return null as T;

    return response.json() as Promise<T>;
}

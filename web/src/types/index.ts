// The wire format, not the database row: JSON has no date type, so what the
// API sends is an ISO string.
export interface User {
  id: string;
  email: string;
  created_at: string;
}

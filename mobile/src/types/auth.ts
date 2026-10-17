export type UserRole = 'citizen' | 'authority';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  googleId?: string;
  role: UserRole;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

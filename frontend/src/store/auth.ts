import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_vendedor: boolean;
  can_edit_prices: boolean;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: 'auth-user',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

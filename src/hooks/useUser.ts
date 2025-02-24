import { useAuthStore } from '@/store/authStore';

export function useUser() {
  const { user } = useAuthStore();
  return { user };
} 
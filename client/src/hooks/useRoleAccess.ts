import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, Role } from '@/store/authStore';

export function useRoleAccess(allowedRoles: Role[], redirectPath = '/dashboard') {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || !allowedRoles.includes(user.role)) {
      router.push(redirectPath);
    }
  }, [user, router, allowedRoles, redirectPath]);

  return {
    user,
    hasAccess: user && allowedRoles.includes(user.role),
    isLoading: !user
  };
}
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Hook to check if the active user possesses the required permissions or roles.
 *
 * @param  {...string} roles Allowed roles, e.g. 'ADMIN', 'TREASURER'
 * @returns {boolean} Whether user has any of the specified roles
 */
export function usePermission(...roles) {
  const { user } = useAuth();
  if (!user) return false;
  return roles.includes(user.role);
}

export function useIsAdmin() {
  return usePermission("ADMIN");
}

export function useIsTreasurer() {
  return usePermission("ADMIN", "TREASURER");
}

export function useIsCommittee() {
  return usePermission("ADMIN", "COMMITTEE");
}

export function useIsResident() {
  return usePermission("RESIDENT");
}

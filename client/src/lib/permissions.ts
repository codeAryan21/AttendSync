import { Role } from '@/store/authStore';

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 100,
  TEACHER: 50,
  STUDENT: 10
};

// Role display names
export const ROLE_NAMES: Record<Role, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student'
};

// Navigation permissions based on role
export const NAVIGATION_PERMISSIONS = {
  // Dashboard access
  dashboard: ['ADMIN', 'TEACHER', 'STUDENT'],
  
  // User management
  userManagement: ['ADMIN'],
  createUser: ['ADMIN'],
  
  // Class management
  classManagement: ['ADMIN', 'TEACHER'],
  createClass: ['ADMIN'], // Only admins can create classes
  
  // Student management
  studentManagement: ['ADMIN', 'TEACHER'],
  
  // Attendance
  attendanceManagement: ['ADMIN', 'TEACHER', 'STUDENT'],
  markAttendance: ['TEACHER'],
  viewAllAttendance: ['ADMIN'],
  
  // Reports
  reports: ['ADMIN', 'TEACHER'],
  
  // Settings
  systemSettings: ['ADMIN']
};

// Feature permissions
export const FEATURE_PERMISSIONS = {
  // Can view system statistics
  viewSystemStats: (role: Role) => role === 'ADMIN',
  
  // Can manage users
  manageUsers: (role: Role) => role === 'ADMIN',
  
  // Can view all students
  viewAllStudents: (role: Role) => ['ADMIN', 'TEACHER'].includes(role),
  
  // Can mark attendance
  markAttendance: (role: Role) => role === 'TEACHER',
  
  // Can view attendance reports
  viewAttendanceReports: (role: Role) => ['ADMIN', 'TEACHER'].includes(role),
  
  // Can create classes
  createClasses: (role: Role) => role === 'ADMIN' // Only admins can create classes
};

// Helper functions
export function hasPermission(userRole: Role, permission: keyof typeof NAVIGATION_PERMISSIONS): boolean {
  return NAVIGATION_PERMISSIONS[permission]?.includes(userRole) || false;
}

export function canAccessFeature(userRole: Role, feature: keyof typeof FEATURE_PERMISSIONS): boolean {
  return FEATURE_PERMISSIONS[feature]?.(userRole) || false;
}

export function getRoleHierarchy(role: Role): number {
  return ROLE_HIERARCHY[role] || 0;
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return getRoleHierarchy(managerRole) > getRoleHierarchy(targetRole);
}

// Get available roles for user creation based on current user role
export function getAvailableRoles(currentUserRole: Role): Role[] {
  const currentHierarchy = getRoleHierarchy(currentUserRole);
  
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, hierarchy]) => hierarchy < currentHierarchy)
    .map(([role, _]) => role as Role);
}

// Role-based menu items
export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
  children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    roles: ['ADMIN', 'TEACHER', 'STUDENT']
  },
  {
    label: 'Users',
    path: '/dashboard/users',
    icon: 'users',
    roles: ['ADMIN']
  },
  {
    label: 'Teachers',
    path: '/dashboard/teachers',
    icon: 'users',
    roles: ['ADMIN']
  },
  {
    label: 'Profile',
    path: '/dashboard/profile',
    icon: 'user',
    roles: ['TEACHER', 'STUDENT']
  },
  {
    label: 'Classes',
    path: '/dashboard/classes',
    icon: 'classroom',
    roles: ['ADMIN', 'TEACHER']
  },
  {
    label: 'Students',
    path: '/dashboard/students',
    icon: 'student',
    roles: ['ADMIN']
  },
  {
    label: 'Attendance',
    path: '/dashboard/attendance/admin',
    icon: 'attendance',
    roles: ['ADMIN']
  },
  {
    label: 'Attendance',
    path: '/dashboard/attendance',
    icon: 'attendance',
    roles: ['TEACHER', 'STUDENT']
  },
  {
    label: 'Reports',
    path: '/dashboard/reports',
    icon: 'chart',
    roles: ['ADMIN', 'TEACHER']
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: 'settings',
    roles: ['ADMIN']
  }
];

// Filter menu items based on user role
export function getMenuItemsForRole(userRole: Role): MenuItem[] {
  return MENU_ITEMS.filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      children: item.children?.filter(child => child.roles.includes(userRole))
    }));
}
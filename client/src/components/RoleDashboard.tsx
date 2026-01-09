'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function RoleDashboard() {
  const { user } = useAuthStore();

  if (!user) return null;

  const renderDashboardByRole = () => {
    switch (user.role) {
      case 'ADMIN':
        return <AdminDashboard user={user} />;
      
      case 'TEACHER':
        return <TeacherDashboard user={user} />;
      
      case 'STUDENT':
        return <StudentDashboard user={user} />;
      
      default:
        return <div>Role not recognized</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-blue-100">
          {user.role === 'ADMIN' ? 'Administrator' : user.role === 'TEACHER' ? 'Teacher' : 'Student'} • AttendSync Institute
        </p>
        {user.employeeId && (
          <p className="text-blue-200 text-sm mt-1">
            Employee ID: {user.employeeId}
          </p>
        )}
      </div>

      {/* Role-specific Dashboard */}
      {renderDashboardByRole()}
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ user }: { user: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <div className="col-span-full">
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Students" value="1,247" icon="👨‍🎓" color="blue" />
          <StatCard title="Active Teachers" value="89" icon="👩🏻‍🏫" color="green" />
          <StatCard title="Total Classes" value="156" icon="🏢" color="purple" />
          <StatCard title="Today's Attendance" value="94.2%" icon="📊" color="orange" />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionCard
        title="User Management"
        description="Manage teachers and student accounts"
        actions={[
          { label: 'Add New User', href: '/dashboard/users', color: 'blue' },
          { label: 'View All Users', href: '/dashboard/users', color: 'gray' }
        ]}
      />

      <QuickActionCard
        title="Class Management"
        description="Manage classes and schedules"
        actions={[
          { label: 'Create Class', href: '/dashboard/classes', color: 'purple' },
          { label: 'View All Classes', href: '/dashboard/classes', color: 'green' }
        ]}
      />

      <QuickActionCard
        title="System Reports"
        description="View system-wide reports and analytics"
        actions={[
          { label: 'Attendance Reports', href: '/dashboard/reports', color: 'orange' },
          { label: 'System Settings', href: '/dashboard/settings', color: 'red' }
        ]}
      />
    </div>
  );
}

// Teacher Dashboard
function TeacherDashboard({ user }: { user: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="col-span-full">
        <h2 className="text-xl font-semibold mb-4">My Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="My Classes" value="8" icon="📚" color="blue" />
          <StatCard title="Total Students" value="240" icon="👥" color="green" />
          <StatCard title="Today's Classes" value="4" icon="🕐" color="purple" />
        </div>
      </div>

      <QuickActionCard
        title="Attendance"
        description="Mark and manage student attendance"
        actions={[
          { label: 'Mark Attendance', href: '/dashboard/attendance', color: 'green' },
          { label: 'View Reports', href: '/dashboard/reports', color: 'blue' }
        ]}
      />

      <QuickActionCard
        title="My Classes"
        description="Manage your assigned classes"
        actions={[
          { label: 'View Classes', href: '/dashboard/classes', color: 'purple' },
          { label: 'Class Schedule', href: '/dashboard/classes', color: 'orange' }
        ]}
      />

      <QuickActionCard
        title="Students"
        description="View and manage your students"
        actions={[
          { label: 'My Students', href: '/dashboard/students', color: 'indigo' },
          { label: 'Student Progress', href: '/dashboard/reports', color: 'pink' }
        ]}
      />
    </div>
  );
}

// Student Dashboard
function StudentDashboard({ user }: { user: any }) {
  const studentProfile = user.studentProfile;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-full">
        <h2 className="text-xl font-semibold mb-4">My Academic Dashboard</h2>
        {studentProfile && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Roll Number</p>
                <p className="font-semibold">{studentProfile.rollNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Batch</p>
                <p className="font-semibold">{studentProfile.batch?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Program</p>
                <p className="font-semibold">{studentProfile.batch?.program}</p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="My Attendance" value="89.5%" icon="📊" color="green" />
          <StatCard title="Classes Today" value="5" icon="📚" color="blue" />
          <StatCard title="Fee Status" value={studentProfile?.feeStatus || 'PAID'} icon="💰" color="purple" />
        </div>
      </div>

      <QuickActionCard
        title="My Attendance"
        description="View your attendance records"
        actions={[
          { label: 'View Attendance', href: '/dashboard/attendance', color: 'blue' },
          { label: 'Monthly Report', href: '/dashboard/attendance', color: 'green' }
        ]}
      />

      <QuickActionCard
        title="My Profile"
        description="Manage your profile and settings"
        actions={[
          { label: 'View Profile', href: '/dashboard/profile', color: 'purple' },
          { label: 'Update Info', href: '/dashboard/profile', color: 'orange' }
        ]}
      />
    </div>
  );
}

// Reusable Components
function StatCard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, actions }: {
  title: string;
  description: string;
  actions: Array<{ label: string; href: string; color: string }>;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="space-y-2">
        {actions.map((action, index) => {
          const colorClasses = {
            blue: 'bg-blue-500 hover:bg-blue-600',
            green: 'bg-green-500 hover:bg-green-600',
            purple: 'bg-purple-500 hover:bg-purple-600',
            orange: 'bg-orange-500 hover:bg-orange-600',
            red: 'bg-red-500 hover:bg-red-600',
            gray: 'bg-gray-500 hover:bg-gray-600',
            indigo: 'bg-indigo-500 hover:bg-indigo-600',
            pink: 'bg-pink-500 hover:bg-pink-600'
          };

          return (
            <Link
              key={index}
              href={action.href}
              className={`block w-full text-center px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                colorClasses[action.color as keyof typeof colorClasses] || colorClasses.blue
              }`}
            >
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
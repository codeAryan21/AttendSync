'use client';

import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Stats {
  totalUsers: number;
  totalClasses: number;
  totalStudents: number;
  totalAttendance: number;
  usersByRole: Record<string, number>;
}

interface StudentStats {
  totalClasses: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Small delay to ensure cookies are set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (user?.role === 'ADMIN') {
        const response = await api.get('/admin/stats');
        setStats(response.data.data);
      } else if (user?.role === 'STUDENT') {
        const response = await api.get('/student/attendance');
        setStudentStats(response.data.data.statistics);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token is invalid, redirect to login
        toast.error('Session expired. Please log in again.');
        router.push('/');
        return;
      }
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
        {user.role === 'TEACHER' && user.designation && (
          <p className="text-blue-200 text-sm mt-1">
            Designation: {user.designation}
          </p>
        )}
      </div>

      {/* Role-specific Dashboard */}
      {user.role === 'ADMIN' && stats && <AdminDashboard stats={stats} user={user} router={router} />}
      {user.role === 'TEACHER' && <TeacherDashboard />}
      {user.role === 'STUDENT' && <EnhancedStudentDashboard />}
    </div>
  );
}

function AdminDashboard({ stats, user, router }: { stats: Stats; user: any; router: any }) {
  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
    },
    {
      name: 'Total Classes',
      value: stats.totalClasses || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
    },
    {
      name: 'Total Students',
      value: stats.totalStudents || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-yellow-500 to-orange-500',
      textColor: 'text-yellow-600',
    },
    {
      name: 'Attendance Records',
      value: stats.totalAttendance || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden shadow-lg rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`bg-gradient-to-r ${card.color} p-3 rounded-xl text-white shadow-lg`}>
                    {card.icon}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-semibold text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className={`text-2xl font-bold ${card.textColor}`}>
                      {card.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.usersByRole && (
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 ml-3">Users by Role</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.usersByRole).map(([role, count]) => {
              const roleColors = {
                ADMIN: 'bg-red-50 text-red-700 border-red-200',
                TEACHER: 'bg-blue-50 text-blue-700 border-blue-200',
                STUDENT: 'bg-green-50 text-green-700 border-green-200',
              };
              return (
                <div key={role} className={`p-4 rounded-xl border-2 ${roleColors[role as keyof typeof roleColors] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">{role}</span>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions Section for Admin */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 p-2 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 ml-3">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/dashboard/teachers/create"
            className="group p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer block text-decoration-none"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-lg mb-2 group-hover:bg-blue-600 transition-colors">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-blue-900 mb-1">Add Teacher</h4>
            <p className="text-xs text-blue-700">Create new teacher account</p>
          </a>

          <a
            href="/dashboard/classes/create"
            className="group p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer block text-decoration-none"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-lg mb-2 group-hover:bg-green-600 transition-colors">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h4 className="font-semibold text-green-900 mb-1">Add Class</h4>
            <p className="text-xs text-green-700">Create new class</p>
          </a>

          <a
            href="/dashboard/students/create"
            className="group p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer block text-decoration-none"
          >
            <div className="flex items-center justify-center w-6 h-6 bg-purple-500 rounded-lg mb-2 group-hover:bg-purple-600 transition-colors">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h4 className="font-semibold text-purple-900 mb-1">Add Student</h4>
            <p className="text-xs text-purple-700">Register new student</p>
          </a>
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useAuthStore();
  const [teacherStats, setTeacherStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayClasses: 0,
    attendanceRate: 0
  });
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const classesResponse = await api.get('/class');
      const classes = classesResponse.data.data || [];
      setMyClasses(classes);
      
      const totalStudents = classes.reduce((sum, cls) => sum + (cls._count?.students || 0), 0);
      
      // Calculate today's classes based on actual schedule
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const todayClasses = classes.filter(cls => {
        if (!cls.schedule) return false;
        return cls.schedule.toLowerCase().includes(today);
      }).length;
      
      // Fetch real attendance rate
      let attendanceRate = 0;
      if (classes.length > 0) {
        try {
          let totalPresent = 0;
          let totalRecords = 0;
          
          for (const cls of classes) {
            try {
              const response = await api.get(`/attendance/${cls.id}`);
              const result = response.data.data;
              
              if (result && result.attendance && Array.isArray(result.attendance)) {
                totalRecords += result.attendance.length;
                totalPresent += result.attendance.filter(r => r.status === 'PRESENT').length;
              }
            } catch (error) {
              continue;
            }
          }
          
          attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        } catch (error) {
          console.error('Failed to fetch attendance data:', error);
        }
      }
      
      setTeacherStats({
        totalClasses: classes.length,
        totalStudents,
        todayClasses,
        attendanceRate
      });
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Teacher Profile Card */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-blue-600 font-medium">{user?.designation || 'Teacher'}</p>
            {user?.employeeId && (
              <p className="text-gray-600 text-sm mt-1">Employee ID: {user.employeeId}</p>
            )}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Email</span>
                  <p className="font-medium text-gray-900 text-sm">{user?.email}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Phone</span>
                  <p className="font-medium text-gray-900 text-sm">{user?.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Experience</span>
                  <p className="font-medium text-gray-900 text-sm">{user?.experience || 0} years</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Qualification</span>
                  <p className="font-medium text-gray-900 text-sm">{user?.qualification || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Specialization</span>
                  <p className="font-medium text-gray-900 text-sm">{user?.specialization || 'N/A'}</p>
                </div>
              </div>
              {user?.address && (
                <div>
                  <span className="text-gray-600 text-xs block mb-1">Address</span>
                  <p className="font-medium text-gray-900 text-sm">{user.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">My Classes</p>
              <p className="text-2xl font-bold text-blue-600">{teacherStats.totalClasses}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-green-600">{teacherStats.totalStudents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Today's Classes</p>
              <p className="text-2xl font-bold text-purple-600">{teacherStats.todayClasses}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-orange-600">{teacherStats.attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 ml-3">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="font-semibold text-green-900 ml-3">My Classes</h4>
            </div>
            <p className="text-sm text-green-700 mb-4">View and manage your assigned classes</p>
            <button 
              onClick={() => window.location.href = '/dashboard/classes'}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
            >
              View Classes
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="font-semibold text-blue-900 ml-3">Attendance</h4>
            </div>
            <p className="text-sm text-blue-700 mb-4">Mark and manage student attendance for your classes</p>
            <button 
              onClick={() => window.location.href = '/dashboard/attendance/teacher'}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Mark Attendance
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-purple-900 ml-3">Reports</h4>
            </div>
            <p className="text-sm text-purple-700 mb-4">View attendance reports and analytics</p>
            <button 
              onClick={() => window.location.href = '/dashboard/reports'}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnhancedStudentDashboard() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, attendanceRes] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/attendance')
      ]);

      setProfile(profileRes.data.data);
      setStats(attendanceRes.data.data.statistics);
      
      const attendancePercentage = attendanceRes.data.data.statistics.attendancePercentage;
      const attendanceThreshold = settings?.attendanceThreshold || 75;
      const generatedNotifications = [];
      
      if (attendancePercentage < attendanceThreshold) {
        generatedNotifications.push({
          id: '1',
          type: 'warning',
          title: 'Low Attendance Alert',
          message: `Your attendance is ${attendancePercentage}%. Minimum required is ${attendanceThreshold}%.`,
        });
      }
      
      if (attendancePercentage >= attendanceThreshold + 15) {
        generatedNotifications.push({
          id: '2',
          type: 'success',
          title: 'Excellent Attendance!',
          message: `Great job! Your attendance is ${attendancePercentage}%.`,
        });
      }

      setNotifications(generatedNotifications);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const attendanceThreshold = settings?.attendanceThreshold || 75;
  const attendanceColor = (stats?.attendancePercentage || 0) >= attendanceThreshold + 5 ? 'green' : 
                         (stats?.attendancePercentage || 0) >= attendanceThreshold ? 'yellow' : 'red';

  return (
    <div className="space-y-6">
      {/* Student Basic Details Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <span className="text-gray-600 text-xs block mb-1">Roll Number</span>
                <p className="font-semibold text-blue-600">{profile?.rollNo || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs block mb-1">Class</span>
                <p className="font-semibold text-green-600">{profile?.class?.name || 'N/A'} - {profile?.class?.section || ''}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs block mb-1">Email</span>
                <p className="font-medium text-gray-900 text-sm">{user?.email}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs block mb-1">Phone</span>
                <p className="font-medium text-gray-900 text-sm">{profile?.user?.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs block mb-1">Date of Birth</span>
                <p className="font-medium text-gray-900 text-sm">{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalClasses || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats?.totalPresent || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats?.totalAbsent || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${
              attendanceColor === 'green' ? 'bg-green-100' : 
              attendanceColor === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <svg className={`w-6 h-6 ${
                attendanceColor === 'green' ? 'text-green-600' : 
                attendanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className={`text-2xl font-bold ${
                attendanceColor === 'green' ? 'text-green-600' : 
                attendanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`}>{stats?.attendancePercentage || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Progress */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Current Rate</span>
              <span className={`text-lg font-bold ${
                attendanceColor === 'green' ? 'text-green-600' : 
                attendanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats?.attendancePercentage || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  attendanceColor === 'green' ? 'bg-green-500' : 
                  attendanceColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats?.attendancePercentage || 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="text-orange-600 font-medium">{attendanceThreshold}% Required</span>
              <span>100%</span>
            </div>
            <div className={`p-4 rounded-lg border ${
              attendanceColor === 'green' ? 'bg-green-50 border-green-200' : 
              attendanceColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                attendanceColor === 'green' ? 'text-green-700' : 
                attendanceColor === 'yellow' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {(stats?.attendancePercentage || 0) >= attendanceThreshold + 5 ? '🎉 Excellent attendance! Keep it up!' :
                 (stats?.attendancePercentage || 0) >= attendanceThreshold ? '👍 Good attendance, maintain this level.' :
                 (stats?.attendancePercentage || 0) >= attendanceThreshold - 15 ? '⚠️ Below required minimum. Attend more classes.' :
                 '🚨 Critical! Immediate improvement needed.'}
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    notification.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-1 rounded-full ${
                      notification.type === 'warning' ? 'bg-yellow-100' :
                      notification.type === 'success' ? 'bg-green-100' :
                      'bg-blue-100'
                    }`}>
                      {notification.type === 'warning' ? '⚠️' :
                       notification.type === 'success' ? '✅' : 'ℹ️'}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${
                        notification.type === 'warning' ? 'text-yellow-800' :
                        notification.type === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 ${
                        notification.type === 'warning' ? 'text-yellow-700' :
                        notification.type === 'success' ? 'text-green-700' :
                        'text-blue-700'
                      }`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Information */}
      {profile?.class && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Class Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-600 font-medium">Class</p>
                  <p className="text-lg font-bold text-blue-800">{profile.class.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-600 font-medium">Section</p>
                  <p className="text-lg font-bold text-green-800">{profile.class.section}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-purple-600 font-medium">Teacher</p>
                  <p className="text-lg font-bold text-purple-800">{profile.class.teacher?.name || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-600 font-medium">Subjects</p>
                  <p className="text-sm font-bold text-orange-800">{profile.class.subjects?.length || 0} Subjects</p>
                </div>
              </div>
            </div>
          </div>

          {profile.class.subjects && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Subjects:</p>
              <div className="flex flex-wrap gap-2">
                {profile.class.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
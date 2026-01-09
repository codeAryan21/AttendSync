'use client';

import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ReportData {
  attendanceByClass: {
    id: string;
    className: string;
    totalStudents: number;
    averageAttendance: number;
    presentToday: number;
  }[];
  attendanceByMonth: any[];
}

interface AdminReportData {
  totalStats: {
    totalStudents: number;
    totalClasses: number;
    totalAttendanceRecords: number;
    overallAttendanceRate: number;
  };
  monthlyTrend: {
    month: string;
    attendanceRate: number;
    presentRecords: number;
    totalRecords: number;
  }[];
  classWiseStats: {
    id: string;
    className: string;
    totalStudents: number;
    totalClasses: number;
    averageAttendance: number;
  }[];
}

interface ClassAttendanceDetails {
  class: {
    name: string;
    section: string;
  };
  stats: {
    totalStudents: number;
    totalClasses: number;
    averageAttendance: number;
  };
  students: {
    rollNo: string;
    user: {
      name: string;
    };
    totalClasses: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
  }[];
}

export default function ReportsPage() {
  const { user } = useAuthStore();

  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'STUDENT')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Reports are only available for teachers, administrators, and students.</p>
      </div>
    );
  }

  if (user.role === 'STUDENT') {
    return <StudentReports />;
  }

  return <LegacyReportsPage />;
}

function StudentReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const response = await api.get('/student/attendance');
      setStats(response.data.data.statistics);
    } catch (error) {
      toast.error('Failed to fetch report data');
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

  const attendanceColor = stats?.attendancePercentage >= 80 ? 'green' : 
                         stats?.attendancePercentage >= 60 ? 'yellow' : 'red';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Reports & Analytics</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Total Classes</h3>
            <p className="text-3xl font-bold text-blue-600">{stats?.totalClasses || 0}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Classes Attended</h3>
            <p className="text-3xl font-bold text-green-600">{stats?.totalPresent || 0}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-900 mb-2">Classes Missed</h3>
            <p className="text-3xl font-bold text-red-600">{stats?.totalAbsent || 0}</p>
          </div>
          <div className={`p-6 rounded-lg border ${
            attendanceColor === 'green' ? 'bg-green-50 border-green-200' :
            attendanceColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              attendanceColor === 'green' ? 'text-green-900' :
              attendanceColor === 'yellow' ? 'text-yellow-900' : 'text-red-900'
            }`}>Attendance Rate</h3>
            <p className={`text-3xl font-bold ${
              attendanceColor === 'green' ? 'text-green-600' :
              attendanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>{stats?.attendancePercentage || 0}%</p>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Performance Insights</h4>
          <p className="text-sm text-gray-700">
            {(stats?.attendancePercentage || 0) >= 90 ? '🎉 Excellent! You have outstanding attendance.' :
             (stats?.attendancePercentage || 0) >= 80 ? '👍 Great! Your attendance is above average.' :
             (stats?.attendancePercentage || 0) >= 75 ? '⚠️ Good, but you\'re close to the minimum requirement.' :
             (stats?.attendancePercentage || 0) >= 60 ? '⚠️ Below requirement. You need to improve attendance.' :
             '🚨 Critical! Immediate attention required for attendance.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function LegacyReportsPage() {
  const { user } = useAuthStore();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [adminReportData, setAdminReportData] = useState<AdminReportData | null>(null);
  const [classAttendanceDetails, setClassAttendanceDetails] = useState<ClassAttendanceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<'overview' | 'class'>('overview');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'trends' | 'alerts'>('overview');
  const [dateRange, setDateRange] = useState('7'); // days

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAdminReportData();
    } else if (user?.role === 'TEACHER') {
      fetchTeacherReportData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchAdminReportData = async () => {
    try {
      const response = await api.get('/admin/reports/overall');
      setAdminReportData(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch admin report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherReportData = async () => {
    try {
      const classesResponse = await api.get('/class');
      const classes = classesResponse.data.data || [];
      
      const attendanceByClass = await Promise.all(
        classes.map(async (cls: any) => {
          try {
            const attendanceResponse = await api.get(`/attendance/${cls.id}`);
            const attendanceData = attendanceResponse.data.data?.attendance || [];
            
            const totalStudents = cls._count?.students || 0;
            const uniqueDates = [...new Set(attendanceData.map((a: any) => a.date))];
            const totalClasses = uniqueDates.length;
            
            const presentCount = attendanceData.filter((a: any) => a.status === 'PRESENT').length;
            const averageAttendance = totalClasses > 0 && totalStudents > 0 
              ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) 
              : 0;

            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendanceData.filter((a: any) => 
              new Date(a.date).toISOString().split('T')[0] === today && a.status === 'PRESENT'
            );

            return {
              id: cls.id,
              className: `${cls.name} - ${cls.section}`,
              totalStudents,
              averageAttendance,
              presentToday: todayAttendance.length
            };
          } catch (error) {
            return {
              id: cls.id,
              className: `${cls.name} - ${cls.section}`,
              totalStudents: cls._count?.students || 0,
              averageAttendance: 0,
              presentToday: 0
            };
          }
        })
      );

      const reportData = {
        attendanceByClass,
        attendanceByMonth: []
      };
      
      setReportData(reportData);
    } catch (error: any) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassAttendanceDetails = async (classId: string) => {
    try {
      const response = await api.get(`/admin/reports/class/${classId}`);
      setClassAttendanceDetails(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch class attendance details');
    }
  };

  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Reports are only available for teachers and administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Admin Dashboard
  if (user.role === 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Reports & Analytics</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['overview', 'class'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedReport(tab as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedReport === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'overview' ? 'System Overview' : 'Class Reports'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {selectedReport === 'overview' && adminReportData && (
              <div className="space-y-6">
                {/* System Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Total Students</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {adminReportData.totalStats.totalStudents}
                    </p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-2">Total Classes</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {adminReportData.totalStats.totalClasses}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-2">Attendance Records</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {adminReportData.totalStats.totalAttendanceRecords}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-2">Overall Attendance</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {adminReportData.totalStats.overallAttendanceRate}%
                    </p>
                  </div>
                </div>

                {/* Monthly Trend */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Monthly Attendance Trend</h3>
                  <div className="overflow-x-auto">
                    <div className="flex space-x-4 pb-4">
                      {adminReportData.monthlyTrend.map((month, index) => (
                        <div key={index} className="flex-shrink-0 bg-gray-50 p-4 rounded-lg border border-gray-200 min-w-[150px]">
                          <p className="font-medium text-gray-900 text-sm">{month.month}</p>
                          <p className="text-2xl font-bold text-gray-800">{month.attendanceRate}%</p>
                          <p className="text-xs text-gray-600">{month.presentRecords}/{month.totalRecords} records</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'class' && adminReportData && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Class-wise Attendance Report</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Students</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Classes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Attendance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adminReportData.classWiseStats.map((cls, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {cls.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{cls.totalStudents}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{cls.totalClasses}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              cls.averageAttendance >= 80 ? 'bg-green-100 text-green-800' :
                              cls.averageAttendance >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {cls.averageAttendance}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => fetchClassAttendanceDetails(cls.id)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Class Attendance Details Modal */}
        {classAttendanceDetails && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-xl">
              <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {classAttendanceDetails.class.name} - {classAttendanceDetails.class.section} - Student Attendance
                </h2>
                <button
                  onClick={() => setClassAttendanceDetails(null)}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[calc(95vh-80px)] bg-gray-50">
                {/* Class Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total Students</p>
                    <p className="text-2xl font-bold text-blue-800">{classAttendanceDetails.stats.totalStudents}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total Classes</p>
                    <p className="text-2xl font-bold text-green-800">{classAttendanceDetails.stats.totalClasses}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Average Attendance</p>
                    <p className="text-2xl font-bold text-purple-800">{classAttendanceDetails.stats.averageAttendance}%</p>
                  </div>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Classes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classAttendanceDetails.students.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.rollNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.totalClasses}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {student.totalPresent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {student.totalAbsent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.attendancePercentage >= 80 ? 'bg-green-100 text-green-800' :
                              student.attendancePercentage >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {student.attendancePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Teacher Dashboard
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teaching Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your classes and attendance</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
          </select>
        </div>
      </div>

      {reportData && reportData.attendanceByClass.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Classes</p>
                  <p className="text-3xl font-bold">{reportData.attendanceByClass.length}</p>
                </div>
                <div className="text-blue-200 text-2xl">🏫</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Students</p>
                  <p className="text-3xl font-bold">{reportData.attendanceByClass.reduce((sum, cls) => sum + cls.totalStudents, 0)}</p>
                </div>
                <div className="text-green-200 text-2xl">👥</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Avg Attendance</p>
                  <p className="text-3xl font-bold">{Math.round(reportData.attendanceByClass.reduce((sum, cls) => sum + cls.averageAttendance, 0) / reportData.attendanceByClass.length || 0)}%</p>
                </div>
                <div className="text-purple-200 text-2xl">📊</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Present Today</p>
                  <p className="text-3xl font-bold">{reportData.attendanceByClass.reduce((sum, cls) => sum + cls.presentToday, 0)}</p>
                </div>
                <div className="text-orange-200 text-2xl">✅</div>
              </div>
            </div>
          </div>

          {/* Class Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Class Performance</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Good (≥80%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">Average (60-79%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Low (&lt;60%)</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportData.attendanceByClass.map((classData: any) => {
                const todayRate = classData.totalStudents > 0 ? Math.round((classData.presentToday / classData.totalStudents) * 100) : 0;
                return (
                  <div key={classData.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 text-lg">{classData.className}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        classData.averageAttendance >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                        classData.averageAttendance >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {classData.averageAttendance >= 80 ? 'Good' : classData.averageAttendance >= 60 ? 'Average' : 'Low'}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Students:</span>
                        <span className="font-semibold text-gray-900">{classData.totalStudents}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Present Today:</span>
                        <span className="font-semibold text-green-600">{classData.presentToday} ({todayRate}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Overall Average:</span>
                        <span className={`font-semibold ${
                          classData.averageAttendance >= 80 ? 'text-green-600' :
                          classData.averageAttendance >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {classData.averageAttendance}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Attendance Progress</span>
                          <span>{classData.averageAttendance}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              classData.averageAttendance >= 80 ? 'bg-green-500' :
                              classData.averageAttendance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(classData.averageAttendance, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {classData.averageAttendance < 75 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-red-500 text-sm mr-2">⚠️</span>
                          <span className="text-red-700 text-xs font-medium">Needs attention</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {reportData.attendanceByClass.filter(cls => cls.averageAttendance >= 80).length}
                </div>
                <div className="text-sm text-green-700 font-medium">Classes Performing Well</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {reportData.attendanceByClass.filter(cls => cls.averageAttendance >= 60 && cls.averageAttendance < 80).length}
                </div>
                <div className="text-sm text-yellow-700 font-medium">Classes Need Monitoring</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {reportData.attendanceByClass.filter(cls => cls.averageAttendance < 60).length}
                </div>
                <div className="text-sm text-red-700 font-medium">Classes Need Attention</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Assigned</h3>
          <p className="text-gray-600">Contact your administrator to get classes assigned.</p>
        </div>
      )}
    </div>
  );
}
'use client';

import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  class: {
    name: string;
    subjects: string[];
  };
  teacher: {
    name: string;
  };
}

interface AttendanceStats {
  totalClasses: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
}

export default function AttendancePage() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      window.location.href = '/dashboard/attendance/teacher';
    } else if (user?.role === 'ADMIN') {
      window.location.href = '/dashboard/attendance/admin';
    }
  }, [user]);

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Access denied. Students only.</p>
      </div>
    );
  }

  return <EnhancedStudentAttendance />;
}

function EnhancedStudentAttendance() {
  const { user } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const response = await api.get('/student/attendance');
      const data = response.data.data;
      
      setAttendanceData(data.attendance || []);
      setStats(data.statistics);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const downloadAttendanceReport = async () => {
    try {
      const response = await api.get('/student/attendance/report', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-report-${user?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Attendance report downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download attendance report');
    }
  };

  const filteredRecords = attendanceData.filter(record => {
    const matchesMonth = !filterMonth || 
      new Date(record.date).toISOString().slice(0, 7) === filterMonth;
    return matchesMonth;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No attendance data available.</p>
      </div>
    );
  }

  const attendanceThreshold = settings?.attendanceThreshold || 75;
  const attendanceColor = stats.attendancePercentage >= (attendanceThreshold + 5) ? 'green' : 
                         stats.attendancePercentage >= attendanceThreshold ? 'yellow' : 'red';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={downloadAttendanceReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Report</span>
          </button>
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalClasses}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalPresent}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
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
              }`}>{stats.attendancePercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Attendance Progress */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Progress</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Overall Attendance Rate</span>
            <span className={`text-lg font-bold ${
              attendanceColor === 'green' ? 'text-green-600' : 
              attendanceColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.attendancePercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                attendanceColor === 'green' ? 'bg-green-500' : 
                attendanceColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.attendancePercentage}%` }}
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
              {stats.attendancePercentage >= (attendanceThreshold + 5) ? '🎉 Excellent attendance! Keep up the great work!' :
               stats.attendancePercentage >= attendanceThreshold ? '👍 Good attendance, meeting the minimum requirement.' :
               `⚠️ Poor attendance (${stats.attendancePercentage}% < ${attendanceThreshold}%). Please attend classes regularly to stay on track.`}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              placeholder="Select month"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilterMonth('')}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
            >
              Clear Filter
            </button>
          </div>
        </div>
        {filterMonth && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Filtered by:</span> {new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Attendance History */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Attendance History ({filteredRecords.length} records)
          </h2>
        </div>
        
        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.class.name}</div>
                      <div className="text-sm text-gray-500">{record.class.subjects.join(', ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.teacher.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'PRESENT'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterMonth ? 'No records match your filter criteria.' : 'No attendance records available yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
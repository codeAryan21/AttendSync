'use client';

import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  rollNo: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface StudentProfile {
  id: string;
  rollNo: string;
  parentName?: string;
  parentPhone?: string;
  admissionDate: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  class: {
    id: string;
    name: string;
    section: string;
    subjects: string[];
    teacher: {
      name: string;
      email: string;
    };
  };
  attendanceStats: {
    totalClasses: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
  };
}

interface Class {
  id: string;
  name: string;
  course: string;
  section: string;
  subjects: string[];
}

interface AttendanceRecord {
  id?: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  student?: Student;
}

export default function TeacherAttendancePage() {
  const { user } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      fetchSettings();
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchExistingAttendance();
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/class');
      setClasses(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch classes');
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await api.get(`/student/class/${selectedClass}`);
      const studentsData = response.data.data?.students || [];
      setStudents(studentsData);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!selectedClass || !selectedDate) return;
    try {
      const response = await api.get(`/attendance/${selectedClass}?date=${selectedDate}`);
      const result = response.data.data;
      
      const attendanceMap: Record<string, 'PRESENT' | 'ABSENT'> = {};
      if (result && result.attendance && Array.isArray(result.attendance)) {
        result.attendance
          .filter((record: AttendanceRecord) => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === selectedDate;
          })
          .forEach((record: AttendanceRecord) => {
            attendanceMap[record.studentId] = record.status;
          });
      }
      setAttendance(attendanceMap);
    } catch (error) {
      setAttendance({});
    }
  };

  const isWithin48Hours = (date: string) => {
    const selectedDateTime = new Date(date).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - selectedDateTime) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  };

  const toggleAttendance = async (studentId: string) => {
    if (!isWithin48Hours(selectedDate)) {
      toast.error('Attendance can only be marked or modified within 48 hours of the class date');
      return;
    }

    const currentStatus = attendance[studentId] || 'ABSENT';
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    
    setAttendance(prev => ({ ...prev, [studentId]: newStatus }));
    
    try {
      await api.post('/attendance/bulk-sync', {
        records: [{
          studentId,
          classId: selectedClass,
          date: selectedDate,
          status: newStatus
        }]
      });
    } catch (error) {
      setAttendance(prev => ({ ...prev, [studentId]: currentStatus }));
      toast.error('Failed to update attendance');
    }
  };

  const markAllPresent = async () => {
    if (!isWithin48Hours(selectedDate)) {
      toast.error('Attendance can only be marked or modified within 48 hours of the class date');
      return;
    }

    const newAttendance: Record<string, 'PRESENT' | 'ABSENT'> = {};
    const records = students.map(student => {
      newAttendance[student.id] = 'PRESENT';
      return {
        studentId: student.id,
        classId: selectedClass,
        date: selectedDate,
        status: 'PRESENT' as const
      };
    });
    
    setAttendance(newAttendance);
    
    try {
      await api.post('/attendance/bulk-sync', { records });
    } catch (error) {
      toast.error('Failed to mark all present');
    }
  };

  const fetchStudentProfile = async (studentId: string) => {
    setStudentLoading(true);
    try {
      const response = await api.get(`/student/profile/${studentId}`);
      setSelectedStudent(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch student profile');
    } finally {
      setStudentLoading(false);
    }
  };

  const markAllAbsent = async () => {
    if (!isWithin48Hours(selectedDate)) {
      toast.error('Attendance can only be marked or modified within 48 hours of the class date');
      return;
    }

    const newAttendance: Record<string, 'PRESENT' | 'ABSENT'> = {};
    const records = students.map(student => {
      newAttendance[student.id] = 'ABSENT';
      return {
        studentId: student.id,
        classId: selectedClass,
        date: selectedDate,
        status: 'ABSENT' as const
      };
    });
    
    setAttendance(newAttendance);
    
    try {
      await api.post('/attendance/bulk-sync', { records });
    } catch (error) {
      toast.error('Failed to mark all absent');
    }
  };



  if (user?.role !== 'TEACHER') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Access denied. Teachers only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                if (e.target.value) {
                  localStorage.setItem('selectedClass', e.target.value);
                } else {
                  localStorage.removeItem('selectedClass');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section} ({cls.subjects.join(', ')})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                localStorage.setItem('selectedDate', e.target.value);
              }}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {selectedClass && (
            <div className="flex items-end space-x-2">
              <button
                onClick={markAllPresent}
                disabled={!isWithin48Hours(selectedDate)}
                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                  isWithin48Hours(selectedDate)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                All Present
              </button>
              <button
                onClick={markAllAbsent}
                disabled={!isWithin48Hours(selectedDate)}
                className={`flex-1 px-3 py-2 rounded-md text-sm ${
                  isWithin48Hours(selectedDate)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                All Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedClass && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Mark Attendance - {selectedDate}
                </h2>
                {!isWithin48Hours(selectedDate) && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                    ⚠️ Attendance can only be modified within 48 hours
                  </div>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : students.length > 0 ? (
              <div className="p-6">
                {/* Attendance Summary */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">Present</p>
                        <p className="text-2xl font-bold text-green-800">
                          {Object.values(attendance).filter(status => status === 'PRESENT').length}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-600 text-sm font-medium">Absent</p>
                        <p className="text-2xl font-bold text-red-800">
                          {students.length - Object.values(attendance).filter(status => status === 'PRESENT').length}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">Attendance Rate</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {students.length > 0 ? Math.round((Object.values(attendance).filter(status => status === 'PRESENT').length / students.length) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={students.length > 0 && Object.values(attendance).filter(status => status === 'PRESENT').length === students.length}
                            onChange={(e) => e.target.checked ? markAllPresent() : markAllAbsent()}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Marked</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student, index) => {
                        const status = attendance[student.id] || 'ABSENT';
                        return (
                          <tr key={student.id} className={`hover:bg-gray-50 ${status === 'PRESENT' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={status === 'PRESENT'}
                                onChange={() => toggleAttendance(student.id)}
                                disabled={!isWithin48Hours(selectedDate)}
                                className={`w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 ${
                                  !isWithin48Hours(selectedDate) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                                  <span className="text-white font-bold text-sm">
                                    {student.user.name?.charAt(0)?.toUpperCase() || 'S'}
                                  </span>
                                </div>
                                <div>
                                  <button
                                    onClick={() => fetchStudentProfile(student.id)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                                  >
                                    {student.user.name}
                                  </button>
                                  <div className="text-sm text-gray-500">{student.user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                {student.rollNo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                status === 'PRESENT'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  status === 'PRESENT' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                {status === 'PRESENT' ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {status === 'PRESENT' ? new Date().toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No students found in this class</p>
              </div>
            )}
          </div>
        )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 bg-opacity-98 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {selectedStudent.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedStudent.user.name}</h2>
                    <p className="text-blue-100">Roll No: {selectedStudent.rollNo}</p>
                    <p className="text-blue-200 text-sm">Class: {selectedStudent.class.name} - {selectedStudent.class.section}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {studentLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Attendance Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Total Classes</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedStudent.attendanceStats?.totalClasses || 0}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-green-700 mb-1">Present</p>
                    <p className="text-2xl font-bold text-green-900">{selectedStudent.attendanceStats?.totalPresent || 0}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-red-700 mb-1">Absent</p>
                    <p className="text-2xl font-bold text-red-900">{selectedStudent.attendanceStats?.totalAbsent || 0}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Attendance</p>
                    <p className="text-2xl font-bold text-purple-900">{selectedStudent.attendanceStats?.attendancePercentage || 0}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Attendance Rate</span>
                    <span className={`text-sm font-bold ${
                      (selectedStudent.attendanceStats?.attendancePercentage || 0) >= (settings?.attendanceThreshold || 75) + 5 ? 'text-green-600' :
                      (selectedStudent.attendanceStats?.attendancePercentage || 0) >= (settings?.attendanceThreshold || 75) ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {selectedStudent.attendanceStats?.attendancePercentage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (selectedStudent.attendanceStats?.attendancePercentage || 0) >= (settings?.attendanceThreshold || 75) + 5 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                        (selectedStudent.attendanceStats?.attendancePercentage || 0) >= (settings?.attendanceThreshold || 75) ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${selectedStudent.attendanceStats?.attendancePercentage || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="text-orange-600 font-medium">{settings?.attendanceThreshold || 75}% Required</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Information Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-blue-500 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Full Name</span>
                        <span className="text-sm text-gray-900 font-medium">{selectedStudent.user.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Roll Number</span>
                        <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{selectedStudent.rollNo}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Email</span>
                        <span className="text-sm text-gray-900">{selectedStudent.user.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Phone</span>
                        <span className="text-sm text-gray-900">{selectedStudent.user.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Admission Date</span>
                        <span className="text-sm text-gray-900">
                          {selectedStudent.admissionDate ? 
                            new Date(selectedStudent.admissionDate).toLocaleDateString() : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-green-500 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Class</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {selectedStudent.class.name} - {selectedStudent.class.section}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Class Teacher</span>
                        <span className="text-sm text-gray-900">{selectedStudent.class.teacher.name}</span>
                      </div>
                      <div className="py-2">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Subjects</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.class.subjects?.map((subject, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {subject}
                            </span>
                          )) || <span className="text-sm text-gray-500">No subjects assigned</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parent/Guardian Information */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-purple-500 rounded-lg mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Parent/Guardian Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Parent Name</span>
                        <span className="text-sm text-gray-900">{selectedStudent.parentName || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Parent Phone</span>
                        <span className="text-sm text-gray-900">{selectedStudent.parentPhone || 'Not provided'}</span>
                      </div>
                    </div>
                    {selectedStudent.user.address && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Address</span>
                        <p className="text-sm text-gray-900">{selectedStudent.user.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useOfflineAttendance } from '@/hooks/useOfflineAttendance';

interface AttendanceFormProps {
  classId: string;
  students: Array<{ id: string; name: string; rollNumber: string }>;
  onSuccess?: () => void;
}

export default function AttendanceFormExample({ classId, students, onSuccess }: AttendanceFormProps) {
  const { markAttendance, loading } = useOfflineAttendance();
  const [attendanceData, setAttendanceData] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Mark attendance for each student
      const promises = Object.entries(attendanceData).map(([studentId, status]) =>
        markAttendance({
          classId,
          studentId,
          status,
          date: new Date().toISOString(),
        })
      );

      await Promise.all(promises);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
          <p className="text-sm text-gray-500 mt-1">
            {navigator.onLine ? 'Online' : 'Offline - Data will sync automatically'}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {students.map((student) => (
            <div key={student.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{student.name}</p>
                <p className="text-sm text-gray-500">Roll: {student.rollNumber}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'PRESENT')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    attendanceData[student.id] === 'PRESENT'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.id, 'ABSENT')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    attendanceData[student.id] === 'ABSENT'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Absent
                </button>

              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || Object.keys(attendanceData).length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Submit Attendance'}
          </button>
        </div>
      </div>
    </form>
  );
}
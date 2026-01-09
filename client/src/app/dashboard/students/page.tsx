'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import DeleteModal from '@/components/DeleteModal';

interface Student {
  id: string;
  rollNo: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  parentName?: string;
  parentPhone?: string;
  class?: {
    id: string;
    name: string;
    section: string;
    subject: string;
  };
}

export default function StudentsPage() {
  const { user, hasAccess } = useRoleAccess(['ADMIN', 'TEACHER']);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (hasAccess) {
      fetchStudents();
    }
  }, [hasAccess]);

  const fetchStudents = async () => {
    try {
      if (user?.role === 'TEACHER') {
        // For teachers, get students from their assigned classes
        const classesResponse = await api.get('/class');
        const teacherClasses = classesResponse.data.data || [];
        
        let allStudents: Student[] = [];
        for (const cls of teacherClasses) {
          try {
            const studentsResponse = await api.get(`/student/class/${cls.id}`);
            const classStudents = studentsResponse.data.data.students || [];
            allStudents = [...allStudents, ...classStudents];
          } catch (error) {
            console.error(`Failed to fetch students for class ${cls.id}`);
          }
        }
        
        // Remove duplicates based on student ID
        const uniqueStudents = allStudents.filter((student, index, self) => 
          index === self.findIndex(s => s.id === student.id)
        );
        
        setStudents(uniqueStudents);
      } else {
        // For admins, get all students
        const response = await api.get('/admin/users?role=STUDENT');
        const studentUsers = response.data.data.users || [];
        
        const transformedStudents = studentUsers.map((user: any) => ({
          id: user.studentProfile?.id || user.id,
          rollNo: user.studentProfile?.rollNo || 'N/A',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
          },
          parentName: user.studentProfile?.parentName,
          parentPhone: user.studentProfile?.parentPhone,
          class: user.studentProfile?.class
        }));
        
        setStudents(transformedStudents);
      }
    } catch (error: any) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      if (user?.role === 'ADMIN') {
        await api.delete(`/admin/users/${selectedStudent.user.id}`);
        toast.success('Student deleted successfully');
        setShowDeleteModal(false);
        fetchStudents();
      } else {
        toast.error('Only admins can delete students');
      }
    } catch (error: any) {
      toast.error('Failed to delete student');
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        entityName="Student"
        createPath="/dashboard/students/create"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search students by name, roll number, or email..."
        buttonColor="purple"
      />

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {user.role === 'ADMIN' ? 'All Students' : 'My Students'} ({filteredStudents.length})
          </h2>
        </div>
        
        {loading ? (
          <LoadingSpinner color="purple" />
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {student.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => router.push(`/dashboard/students/${student.user.id}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            {student.user?.name || 'N/A'}
                          </button>
                          <div className="text-sm text-gray-500">{student.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.rollNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.user?.phone || 'N/A'}</div>
                      {student.parentPhone && (
                        <div className="text-sm text-gray-500">Parent: {student.parentPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.class ? (
                          <div>
                            <div className="font-medium">{student.class.name}</div>
                            <div className="text-gray-500">{student.class.section} - {student.class.subject}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not Assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {user.role === 'ADMIN' && (
                          <button
                            onClick={() => { setSelectedStudent(student); setShowDeleteModal(true); }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                        {user.role === 'TEACHER' && (
                          <span className="text-gray-500 text-sm">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No students match your search criteria.' : 'No students have been added yet.'}
            </p>
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteStudent}
        title="Delete Student"
        itemName={selectedStudent?.user.name || ''}
        itemType="student"
      />
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const classIdFromUrl = searchParams.get('classId');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const studentsPerPage = 10;

  useEffect(() => {
    if (hasAccess) {
      fetchStudents();
    }
  }, [hasAccess, currentPage, searchTerm]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (user?.role === 'TEACHER') {
        // If classId is provided, fetch only that class's students
        if (classIdFromUrl) {
          try {
            const studentsResponse = await api.get(`/student/class/${classIdFromUrl}`);
            const classStudents = studentsResponse.data.data.students || [];
            
            // Apply search filter
            const filteredStudents = searchTerm 
              ? classStudents.filter((student: Student) =>
                  student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  student.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : classStudents;
            
            // Apply pagination
            const startIndex = (currentPage - 1) * studentsPerPage;
            const endIndex = startIndex + studentsPerPage;
            const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
            
            setStudents(paginatedStudents);
            setTotalStudents(filteredStudents.length);
            setTotalPages(Math.ceil(filteredStudents.length / studentsPerPage));
          } catch (error) {
            toast.error('Failed to fetch students for this class');
          }
        } else {
          // For teachers, get students from all their assigned classes
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
          
          // Apply search filter for teachers
          const filteredStudents = searchTerm 
            ? uniqueStudents.filter(student =>
                student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : uniqueStudents;
          
          // Apply pagination for teachers
          const startIndex = (currentPage - 1) * studentsPerPage;
          const endIndex = startIndex + studentsPerPage;
          const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
          
          setStudents(paginatedStudents);
          setTotalStudents(filteredStudents.length);
          setTotalPages(Math.ceil(filteredStudents.length / studentsPerPage));
        }
      } else {
        // For admins, use backend pagination and search
        const params = new URLSearchParams({
          role: 'STUDENT',
          page: currentPage.toString(),
          limit: studentsPerPage.toString(),
          ...(searchTerm && { search: searchTerm })
        });
        
        const response = await api.get(`/admin/users?${params}`);
        const { users, pagination } = response.data.data;
        
        const transformedStudents = users.map((user: any) => ({
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
        setTotalStudents(pagination.total);
        setTotalPages(pagination.pages);
        setCurrentPage(pagination.page);
      }
    } catch (error: any) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when search term changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {classIdFromUrl && (
            <button
              onClick={() => router.push('/dashboard/classes')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classIdFromUrl ? 'Class Students' : 'Students'}
            </h1>
          </div>
        </div>
      </div>
      <PageHeader
        title=""
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
            {user?.role === 'ADMIN' ? 'All Students' : 'My Students'} ({totalStudents})
          </h2>
        </div>
        
        {loading ? (
          <LoadingSpinner color="purple" />
        ) : students.length > 0 ? (
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
                {students.map((student) => (
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
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => { setSelectedStudent(student); setShowDeleteModal(true); }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                        {user?.role === 'TEACHER' && (
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, totalStudents)} of {totalStudents} students
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, currentPage - 2);
                  const pageNum = startPage + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'hover:bg-gray-50 text-gray-700 border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }).filter(Boolean)}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
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
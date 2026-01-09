'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
  assignedClasses: {
    id: string;
    name: string;
    code: string;
    studentCount: number;
  }[];
}

export default function TeachersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherDetails, setTeacherDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    employeeId: '', 
    designation: '', 
    qualification: '', 
    experience: '', 
    specialization: '' 
  });

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/dashboard');
    } else {
      fetchTeachers();
    }
  }, [user, router]);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/admin/users?role=TEACHER');
      const teacherUsers = response.data.data.users || [];
      
      const teachersWithClasses = await Promise.all(
        teacherUsers.map(async (teacher: any) => {
          try {
            const classResponse = await api.get(`/class?teacherId=${teacher.id}`);
            return {
              ...teacher,
              assignedClasses: classResponse.data.data || []
            };
          } catch (error) {
            return {
              ...teacher,
              assignedClasses: []
            };
          }
        })
      );
      
      setTeachers(teachersWithClasses);
    } catch (error: any) {
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
    setLoadingDetails(true);
    
    try {
      const [teacherResponse, classesResponse] = await Promise.all([
        api.get(`/admin/users/${teacher.id}`),
        api.get('/admin/classes')
      ]);
      
      const allClasses = classesResponse.data.data || [];
      const assignedClasses = allClasses.filter((cls: any) => cls.teacherId === teacher.id);
      
      const classesWithStudents = await Promise.all(
        assignedClasses.map(async (cls: any) => {
          try {
            const studentsResponse = await api.get(`/student/class/${cls.id}`);
            const students = studentsResponse.data.data?.students || [];
            return {
              ...cls,
              studentCount: students.length,
              students: students
            };
          } catch (error) {
            return {
              ...cls,
              studentCount: 0,
              students: []
            };
          }
        })
      );
      
      setTeacherDetails({
        ...teacherResponse.data.data,
        assignedClasses: classesWithStudents,
        totalStudents: classesWithStudents.reduce((sum, cls) => sum + cls.studentCount, 0)
      });
    } catch (error) {
      console.error('Failed to fetch teacher details:', error);
      setTeacherDetails(teacher);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setEditForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      employeeId: teacher.employeeId || '',
      designation: teacher.designation || '',
      qualification: teacher.qualification || '',
      experience: teacher.experience?.toString() || '',
      specialization: teacher.specialization || ''
    });
    setSelectedClasses(teacher.assignedClasses.map(cls => cls.id));
    fetchAvailableClasses();
    setShowEditModal(true);
  };

  const fetchAvailableClasses = async () => {
    try {
      const response = await api.get('/admin/classes');
      setAvailableClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch classes');
    }
  };

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        employeeId: editForm.employeeId,
        designation: editForm.designation,
        qualification: editForm.qualification,
        experience: editForm.experience ? parseInt(editForm.experience) : null,
        specialization: editForm.specialization
      };
      
      await api.put(`/admin/users/${selectedTeacher.id}`, updateData);
      
      // Update class assignments
      await api.put(`/admin/users/${selectedTeacher.id}/classes`, {
        classIds: selectedClasses
      });
      
      toast.success('Teacher updated successfully');
      setShowEditModal(false);
      fetchTeachers();
    } catch (error: any) {
      toast.error('Failed to update teacher');
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      await api.delete(`/admin/users/${selectedTeacher.id}`);
      toast.success('Teacher deleted successfully');
      setShowDeleteModal(false);
      fetchTeachers();
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        router.push('/');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Only admins can delete teachers.');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Cannot delete teacher with assigned classes.');
      } else {
        toast.error('Failed to delete teacher');
      }
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <button 
          onClick={() => router.push('/dashboard/teachers/create')}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add New Teacher
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search teachers by name, email, or employee ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            All Teachers ({filteredTeachers.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTeachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Compact Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {teacher.name?.charAt(0)?.toUpperCase() || 'T'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{teacher.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{teacher.email}</p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="space-y-2 mb-4">
                  {teacher.employeeId && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 w-16 flex-shrink-0">ID:</span>
                      <span className="text-gray-900 font-medium">{teacher.employeeId}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-16 flex-shrink-0">Classes:</span>
                    <span className="text-gray-900 font-medium">{teacher.assignedClasses.length}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between space-x-2">
                  <button 
                    onClick={() => openViewModal(teacher)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openEditModal(teacher)}
                    className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => { setSelectedTeacher(teacher); setShowDeleteModal(true); }}
                    className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No teachers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No teachers match your search criteria.' : 'No teachers have been added yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Teacher Modal */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Edit Teacher Profile</h3>
                    <p className="text-indigo-100 text-sm">Update teacher information and class assignments</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="text-white hover:text-indigo-200 p-3 hover:bg-white hover:bg-opacity-10 rounded-xl transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-blue-900">Basic Information</h4>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-2">Full Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-2">Email Address *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-2">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-blue-800 mb-2">Employee ID</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={editForm.employeeId}
                          onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="Enter employee ID"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-purple-900">Professional Details</h4>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-purple-800 mb-2">Designation</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={editForm.designation}
                          onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="e.g., Senior Teacher, Head of Department"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-800 mb-2">Qualification</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={editForm.qualification}
                          onChange={(e) => setEditForm({...editForm, qualification: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="e.g., M.Sc. Mathematics, B.Ed."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-800 mb-2">Experience (Years)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input
                          type="number"
                          value={editForm.experience}
                          onChange={(e) => setEditForm({...editForm, experience: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm text-gray-900"
                          placeholder="Enter years of experience"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-800 mb-2">Specialization</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={editForm.specialization}
                          onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                          placeholder="e.g., Mathematics, Physics, Chemistry"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Class Assignment Section */}
              <div className="mt-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-emerald-900">Class Assignments</h4>
                </div>
                
                <div className="bg-white rounded-xl border border-emerald-200 max-h-64 overflow-y-auto">
                  {availableClasses.map((cls, index) => (
                    <label key={cls.id} className={`flex items-center p-4 hover:bg-emerald-50 cursor-pointer transition-colors ${index !== availableClasses.length - 1 ? 'border-b border-emerald-100' : ''}`}>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClasses([...selectedClasses, cls.id]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                            }
                          }}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedClasses.includes(cls.id) 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-gray-300 hover:border-emerald-400'
                        }`}>
                          {selectedClasses.includes(cls.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-emerald-900">{cls.name}</span>
                            <span className="text-sm text-emerald-600 ml-2 bg-emerald-100 px-2 py-1 rounded-full">{cls.course}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full font-medium">
                              {cls.totalStudents || 0} students
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {availableClasses.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-emerald-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-emerald-600 font-medium">No classes available</p>
                    <p className="text-emerald-500 text-sm">Create classes first to assign them to teachers</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 flex justify-end space-x-4 border-t border-gray-200">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditTeacher} 
                className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 shadow-lg transform hover:scale-105"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Teacher
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Teacher</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{selectedTeacher.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                  Cancel
                </button>
                <button onClick={handleDeleteTeacher} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Details Modal */}
      {showViewModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {selectedTeacher.name?.charAt(0)?.toUpperCase() || 'T'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedTeacher.name}</h3>
                    <p className="text-green-100">{selectedTeacher.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedTeacher.employeeId && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                          ID: {selectedTeacher.employeeId}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                        TEACHER
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedTeacher(null); setShowViewModal(false); setTeacherDetails(null); }}
                  className="text-white hover:text-green-200 p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Personal & Contact Info */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                      <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Personal Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-blue-200">
                          <span className="text-blue-700 font-medium">Full Name</span>
                          <span className="text-blue-900 font-semibold">{teacherDetails?.name || selectedTeacher.name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-blue-200">
                          <span className="text-blue-700 font-medium">Employee ID</span>
                          <span className="text-blue-900 font-semibold">{teacherDetails?.employeeId || selectedTeacher.employeeId || 'Not assigned'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-blue-700 font-medium">Status</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                      <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Details
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-purple-700 font-medium text-sm">Email Address</p>
                            <p className="text-purple-900 font-semibold">{teacherDetails?.email || selectedTeacher.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-purple-700 font-medium text-sm">Phone Number</p>
                            <p className="text-purple-900 font-semibold">{teacherDetails?.phone || selectedTeacher.phone || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Professional Info */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
                      <h4 className="text-lg font-bold text-orange-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Professional Details
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-orange-200">
                          <span className="text-orange-700 font-medium">Designation</span>
                          <span className="text-orange-900 font-semibold">{teacherDetails?.designation || selectedTeacher.designation || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-orange-200">
                          <span className="text-orange-700 font-medium">Qualification</span>
                          <span className="text-orange-900 font-semibold">{teacherDetails?.qualification || selectedTeacher.qualification || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-orange-200">
                          <span className="text-orange-700 font-medium">Experience</span>
                          <span className="text-orange-900 font-semibold">{(teacherDetails?.experience || selectedTeacher.experience) ? `${teacherDetails?.experience || selectedTeacher.experience} years` : 'Not provided'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-orange-700 font-medium">Specialization</span>
                          <span className="text-orange-900 font-semibold">{teacherDetails?.specialization || selectedTeacher.specialization || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                      <h4 className="text-lg font-bold text-emerald-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Teaching Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-emerald-100">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{teacherDetails?.assignedClasses?.length || 0}</div>
                            <div className="text-sm text-emerald-700 font-medium">Classes</div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-emerald-100">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{teacherDetails?.totalStudents || 0}</div>
                            <div className="text-sm text-emerald-700 font-medium">Students</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Assigned Classes */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-teal-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Assigned Classes
                        </h4>
                        <span className="bg-teal-200 text-teal-800 text-sm font-bold px-3 py-1 rounded-full">
                          {teacherDetails?.assignedClasses?.length || 0} classes
                        </span>
                      </div>
                      
                      {teacherDetails?.assignedClasses?.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {teacherDetails.assignedClasses.map((cls: any) => (
                            <div key={cls.id} className="bg-white rounded-xl p-4 border border-teal-100 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h5 className="font-bold text-teal-900">{cls.name}</h5>
                                  <p className="text-teal-700 text-sm">{cls.course} - Section {cls.section}</p>
                                </div>
                                <div className="text-right">
                                  <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {cls.studentCount} students
                                  </span>
                                </div>
                              </div>
                              {cls.subjects && cls.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {cls.subjects.map((subject: string, index: number) => (
                                    <span key={index} className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-md border border-teal-200">
                                      {subject}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {cls.schedule && (
                                <div className="mt-2 text-xs text-teal-600">
                                  <span className="font-medium">Schedule:</span> {cls.schedule}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <svg className="w-12 h-12 text-teal-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <p className="text-teal-700 font-medium">No classes assigned</p>
                          <p className="text-teal-600 text-sm">This teacher is available for new class assignments</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => { setSelectedTeacher(null); setShowViewModal(false); setTeacherDetails(null); }}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-teal-600 rounded-xl hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
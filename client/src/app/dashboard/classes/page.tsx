'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import PageHeader from '@/components/PageHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import DeleteModal from '@/components/DeleteModal';

interface Class {
  id: string;
  name: string;
  course: string;
  subjects: string[];
  academicYear: string;
  section: string;
  schedule?: string;
  description?: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: {
    subjectTeachers?: Array<{
      subject: string;
      teacherId: string;
    }>;
  };
  _count?: {
    students: number;
  };
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ClassesPage() {
  const { user, hasAccess } = useRoleAccess(['ADMIN', 'TEACHER']);
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [editForm, setEditForm] = useState({ 
    name: '', 
    course: '', 
    subjects: [''], 
    academicYear: '', 
    section: '', 
    schedule: '', 
    description: '',
    subjectTeachers: [{ subject: '', teacherId: '' }]
  });

  useEffect(() => {
    if (hasAccess) {
      fetchClasses();
    }
  }, [hasAccess]);

  const fetchClasses = async () => {
    try {
      const classResponse = await api.get('/class');
      setClasses(classResponse.data.data || []);
      
      // Only fetch teachers if user is admin
      if (user?.role === 'ADMIN') {
        const teacherResponse = await api.get('/admin/users?role=TEACHER');
        const allUsers = teacherResponse.data.data.users || [];
        const actualTeachers = allUsers.filter(user => user.role === 'TEACHER');
        setTeachers(actualTeachers);
      }
    } catch (error: any) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subjects?.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    cls.academicYear?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignTeacher = async () => {
    if (!selectedClass || !selectedTeacherId) return;
    
    try {
      await api.put(`/class/${selectedClass.id}`, {
        name: selectedClass.name,
        course: selectedClass.course,
        subjects: selectedClass.subjects,
        academicYear: selectedClass.academicYear,
        section: selectedClass.section,
        schedule: selectedClass.schedule,
        description: selectedClass.description,
        teacherId: selectedTeacherId
      });
      toast.success('Teacher assigned successfully');
      setShowAssignModal(false);
      fetchClasses();
    } catch (error: any) {
      toast.error('Failed to assign teacher');
    }
  };

  const openAssignModal = (cls: Class) => {
    setSelectedClass(cls);
    setSelectedTeacherId(cls.teacher?.id || '');
    setShowAssignModal(true);
  };

  const openEditModal = (cls: Class) => {
    // Get existing subject teachers from metadata or create default assignments
    const existingSubjectTeachers = cls.metadata?.subjectTeachers || [];
    const subjectTeachers = cls.subjects?.map(subject => {
      const existing = existingSubjectTeachers.find(st => st.subject === subject);
      return {
        subject,
        teacherId: existing?.teacherId || ''
      };
    }) || [];
    
    setSelectedClass(cls);
    setEditForm({
      name: cls.name,
      course: cls.course,
      subjects: cls.subjects || [''],
      academicYear: cls.academicYear,
      section: cls.section,
      schedule: cls.schedule || '',
      description: cls.description || '',
      subjectTeachers
    });
    setShowEditModal(true);
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    
    const validSubjects = editForm.subjects.filter(s => s.trim());
    if (validSubjects.length === 0) {
      toast.error('At least one subject is required');
      return;
    }
    
    try {
      const updateData = {
        name: editForm.name.trim(),
        course: editForm.course.trim(),
        subjects: validSubjects,
        academicYear: editForm.academicYear.trim(),
        section: editForm.section.trim(),
        schedule: editForm.schedule?.trim() || '',
        description: editForm.description?.trim() || '',
        teacherId: selectedClass.teacher?.id,
        subjectTeachers: editForm.subjectTeachers.filter(st => 
          st.subject.trim() && st.teacherId.trim()
        )
      };
      
      await api.put(`/class/${selectedClass.id}`, updateData);
      toast.success('Class updated successfully');
      setShowEditModal(false);
      setSelectedClass(null);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    try {
      await api.delete(`/class/${selectedClass.id}`);
      toast.success('Class deleted successfully');
      setShowDeleteModal(false);
      fetchClasses();
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        router.push('/');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Only admins can delete classes.');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Cannot delete class with students or attendance records.');
      } else {
        toast.error('Failed to delete class');
      }
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        entityName="Class"
        createPath="/dashboard/classes/create"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search classes by name, section, subject, or teacher..."
        buttonColor="green"
      />

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {user.role === 'ADMIN' ? 'All Classes' : 'My Classes'} ({filteredClasses.length})
          </h2>
        </div>
        
        {loading ? (
          <LoadingSpinner color="green" />
        ) : filteredClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {filteredClasses.map((cls) => (
              <div key={cls.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {cls.name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{cls.name}</h3>
                      <p className="text-gray-600 text-xs">{cls.course} • {cls.section}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => setSelectedClass(cls)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {user.role === 'ADMIN' && (
                      <>
                        <button 
                          onClick={() => openEditModal(cls)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => { setSelectedClass(cls); setShowDeleteModal(true); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium text-gray-900">{cls._count?.students || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Class Teacher:</span>
                    <span className="font-medium text-gray-900">{cls.teacher?.name || 'Not assigned'}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600">Subjects:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {cls.subjects?.join(', ') || 'No subjects'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {user.role === 'TEACHER' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/attendance/teacher?classId=${cls.id}`)}
                      className="px-2 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/students?classId=${cls.id}`)}
                      className="px-2 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Students
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No classes match your search criteria.' : 'No classes have been created yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Class Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-80 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden mb-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {selectedClass.name?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedClass.name}</h3>
                    <p className="text-green-100">Section {selectedClass.section} • {selectedClass.course}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                        {selectedClass._count?.students || 0} Students
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                        CLASS
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClass(null)}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Class Info */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Class Information
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-blue-200">
                        <span className="text-blue-700 font-medium">Class Name</span>
                        <span className="text-blue-900 font-semibold">{selectedClass.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-blue-200">
                        <span className="text-blue-700 font-medium">Section</span>
                        <span className="text-blue-900 font-semibold">{selectedClass.section}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-blue-200">
                        <span className="text-blue-700 font-medium">Subjects</span>
                        <span className="text-blue-900 font-semibold">{selectedClass.subjects?.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-blue-700 font-medium">Created</span>
                        <span className="text-blue-900 font-semibold">{new Date(selectedClass.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedClass.description && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                      <h4 className="text-lg font-bold text-orange-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Description
                      </h4>
                      <p className="text-orange-800 leading-relaxed">{selectedClass.description}</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Teacher & Students */}
                <div className="space-y-6">
                  {/* Teacher Information */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                    <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Class Teacher
                    </h4>
                    
                    {selectedClass.teacher ? (
                      <div className="bg-white rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {selectedClass.teacher.name?.charAt(0)?.toUpperCase() || 'T'}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-bold text-purple-900">{selectedClass.teacher.name}</h5>
                            <p className="text-purple-700 text-sm">{selectedClass.teacher.email}</p>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                              Class Teacher
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <svg className="w-12 h-12 text-purple-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-purple-700 font-medium">No class teacher assigned</p>
                        <p className="text-purple-600 text-sm">This class needs a class teacher assignment</p>
                      </div>
                    )}
                  </div>

                  {/* Student Statistics */}
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
                    <h4 className="text-lg font-bold text-teal-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Student Information
                    </h4>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-2xl">{selectedClass._count?.students || 0}</span>
                      </div>
                      <h5 className="text-2xl font-bold text-teal-900 mb-1">{selectedClass._count?.students || 0}</h5>
                      <p className="text-teal-700 font-medium">Enrolled Students</p>
                      <p className="text-teal-600 text-sm mt-2">Active learners in this class</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => setSelectedClass(null)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-80 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden mb-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Edit Class</h3>
                    <p className="text-indigo-100 text-sm">Update class information and assignments</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="text-white hover:text-indigo-200 p-2 hover:bg-white hover:bg-opacity-10 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Info */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-blue-700 mb-2">Class Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-700 mb-2">Course</label>
                        <input
                          type="text"
                          value={editForm.course}
                          onChange={(e) => setEditForm({...editForm, course: e.target.value})}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-2">Section</label>
                          <input
                            type="text"
                            value={editForm.section}
                            onChange={(e) => setEditForm({...editForm, section: e.target.value})}
                            className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-blue-700 mb-2">Academic Year</label>
                          <input
                            type="text"
                            value={editForm.academicYear}
                            onChange={(e) => setEditForm({...editForm, academicYear: e.target.value})}
                            className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-700 mb-2">Schedule</label>
                        <input
                          type="text"
                          value={editForm.schedule}
                          onChange={(e) => setEditForm({...editForm, schedule: e.target.value})}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g., Mon,Wed,Fri 10:00-11:00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-blue-700 mb-2">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                          rows={3}
                          placeholder="Class description..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Subject-Teacher Assignments */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Subject Teachers
                    </h4>
                    <div className="space-y-4">
                      {editForm.subjectTeachers.map((item, index) => {
                        const teacherName = teachers.find(t => t.id === item.teacherId)?.name || 'Not assigned';
                        return (
                          <div key={index} className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                      {item.subject.charAt(0)?.toUpperCase() || 'S'}
                                    </span>
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-green-900">{item.subject}</h5>
                                    <p className="text-green-700 text-sm">{teacherName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {item.teacherId ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Assigned
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Unassigned
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-green-700 mb-1">Assign Teacher</label>
                                <select
                                  value={item.teacherId}
                                  onChange={(e) => {
                                    const updated = [...editForm.subjectTeachers];
                                    updated[index] = { ...updated[index], teacherId: e.target.value };
                                    setEditForm({...editForm, subjectTeachers: updated});
                                  }}
                                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="">Select Teacher</option>
                                  {teachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                      {teacher.name} ({teacher.email})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {editForm.subjectTeachers.length === 0 && (
                        <div className="text-center py-6">
                          <svg className="w-12 h-12 text-green-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <p className="text-green-700 font-medium">No subjects available</p>
                          <p className="text-green-600 text-sm">Add subjects to assign teachers</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-4 flex justify-end space-x-4 border-t">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditClass} 
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-lg"
              >
                Update Class
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteClass}
        title="Delete Class"
        itemName={selectedClass?.name || ''}
        itemType="class"
      />

      {/* Assign Teacher Modal */}
      {showAssignModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Teacher</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <p className="text-sm text-gray-900">{selectedClass.name} - {selectedClass.section} ({selectedClass.course})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Teacher</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No teacher assigned</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignTeacher}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Assign Teacher
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
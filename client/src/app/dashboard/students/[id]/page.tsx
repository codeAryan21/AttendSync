'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface EditForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  rollNo: string;
  parentName: string;
  parentPhone: string;
  classId: string;
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
  attendanceStats?: {
    totalClasses: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
  };
}

export default function StudentProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState<{dateOfBirth?: string; gender?: string; address?: string}>({});
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    rollNo: '',
    parentName: '',
    parentPhone: '',
    classId: '',
  });

  useEffect(() => {
    if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
      router.push('/dashboard');
    } else {
      fetchStudentProfile();
      if (user.role === 'ADMIN') {
        fetchClasses();
      }
    }
  }, [user, router, params.id]);

  const parseAdditionalInfo = (address: string) => {
    const info: {dateOfBirth?: string; gender?: string; address?: string} = {};
    if (!address) return info;
    
    const parts = address.split(' | ');
    if (parts.length > 1) {
      info.address = parts[0];
      const additionalPart = parts[1];
      const dobMatch = additionalPart.match(/DOB: ([^,]+)/);
      const genderMatch = additionalPart.match(/Gender: ([^,]+)/);
      if (dobMatch) info.dateOfBirth = dobMatch[1];
      if (genderMatch) info.gender = genderMatch[1];
    } else {
      const dobMatch = address.match(/DOB: ([^,]+)/);
      const genderMatch = address.match(/Gender: ([^,]+)/);
      if (dobMatch || genderMatch) {
        if (dobMatch) info.dateOfBirth = dobMatch[1];
        if (genderMatch) info.gender = genderMatch[1];
      } else {
        info.address = address;
      }
    }
    return info;
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/class');
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch classes');
    }
  };

  const fetchStudentProfile = async () => {
    try {
      let response;
      if (user?.role === 'ADMIN') {
        response = await api.get(`/admin/users/${params.id}`);
        const userData = response.data.data;
        
        const transformedStudent = {
          id: userData.studentProfile?.id || userData.id,
          rollNo: userData.studentProfile?.rollNo || 'N/A',
          parentName: userData.studentProfile?.parentName,
          parentPhone: userData.studentProfile?.parentPhone,
          admissionDate: userData.studentProfile?.admissionDate || userData.createdAt,
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address
          },
          class: userData.studentProfile?.class || null,
          attendanceStats: userData.attendanceStats
        };
        
        setStudent(transformedStudent);
        setAdditionalInfo(parseAdditionalInfo(userData.address || ''));
      } else {
        // For teachers, find student in their classes
        const classesResponse = await api.get('/class');
        const teacherClasses = classesResponse.data.data || [];
        
        let foundStudent = null;
        for (const cls of teacherClasses) {
          try {
            const studentsResponse = await api.get(`/student/class/${cls.id}`);
            const classStudents = studentsResponse.data.data.students || [];
            foundStudent = classStudents.find(s => s.user.id === params.id);
            if (foundStudent) break;
          } catch (error) {
            continue;
          }
        }
        
        if (foundStudent) {
          setStudent({
            id: foundStudent.id,
            rollNo: foundStudent.rollNo,
            parentName: foundStudent.parentName,
            parentPhone: foundStudent.parentPhone,
            admissionDate: foundStudent.createdAt,
            user: foundStudent.user,
            class: foundStudent.class
          });
          setAdditionalInfo(parseAdditionalInfo(foundStudent.user.address || ''));
        } else {
          toast.error('Student not found in your assigned classes');
          router.push('/dashboard/students');
        }
      }
    } catch (error: any) {
      toast.error('Failed to fetch student profile');
      router.push('/dashboard/students');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (student) {
      const formData = {
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone || '',
        address: additionalInfo.address || '',
        dateOfBirth: additionalInfo.dateOfBirth || '',
        gender: additionalInfo.gender || '',
        rollNo: student.rollNo,
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        classId: student.class?.id || '',
      };
      setEditForm(formData);
      setIsEditing(true);
    }
  };

  const onSubmit = async (data: EditForm) => {
    try {
      await api.put(`/admin/users/${student?.user.id}`, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender,
        rollNo: editForm.rollNo,
        classId: editForm.classId,
        parentName: editForm.parentName,
        parentPhone: editForm.parentPhone,
      });
      toast.success('Student updated successfully');
      setIsEditing(false);
      fetchStudentProfile();
    } catch (error: any) {
      toast.error('Failed to update student');
    }
  };

  if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900">Student not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/students')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student?.user?.name || 'Student'}</h1>
            <p className="text-gray-600">Student Profile</p>
          </div>
        </div>
        {user.role === 'ADMIN' && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input 
                    type="text"
                    value={editForm.name || ''} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email"
                    value={editForm.email || ''} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel"
                    value={editForm.phone || ''} 
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input 
                    type="date"
                    value={editForm.dateOfBirth || ''} 
                    onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select 
                    value={editForm.gender || ''} 
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                  <input 
                    type="text"
                    value={editForm.rollNo || ''} 
                    onChange={(e) => setEditForm({...editForm, rollNo: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea 
                    rows={3}
                    value={editForm.address || ''} 
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Academic Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                  <select 
                    value={editForm.classId || ''} 
                    onChange={(e) => setEditForm({...editForm, classId: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Parent Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                    <input 
                      type="text"
                      value={editForm.parentName || ''} 
                      onChange={(e) => setEditForm({...editForm, parentName: e.target.value})} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
                    <input 
                      type="tel"
                      value={editForm.parentPhone || ''} 
                      onChange={(e) => setEditForm({...editForm, parentPhone: e.target.value})} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.user?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Roll Number</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.rollNo || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.user?.phone || 'Not provided'}</p>
                </div>
                {additionalInfo.dateOfBirth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(additionalInfo.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                )}
                {additionalInfo.gender && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Gender</label>
                    <p className="mt-1 text-sm text-gray-900">{additionalInfo.gender}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{additionalInfo.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Admission Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(student?.admissionDate || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Parent Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Parent Name</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.parentName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Parent Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.parentPhone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {student?.attendanceStats && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{student.attendanceStats.totalClasses}</p>
                    <p className="text-sm text-gray-500">Total Classes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{student.attendanceStats.totalPresent}</p>
                    <p className="text-sm text-gray-500">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{student.attendanceStats.totalAbsent}</p>
                    <p className="text-sm text-gray-500">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{student.attendanceStats.attendancePercentage}%</p>
                    <p className="text-sm text-gray-500">Attendance</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Class Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Class</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.class?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Section</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.class?.section || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Subjects</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student?.class?.subjects?.map((subject, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Class Teacher</label>
                  <p className="mt-1 text-sm text-gray-900">{student?.class?.teacher?.name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{student?.class?.teacher?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
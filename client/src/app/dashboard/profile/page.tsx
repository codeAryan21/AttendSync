'use client';

import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
  designation?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  course: string;
  subjects: string[];
  section: string;
  schedule?: string;
  _count: { students: number };
}

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Use enhanced student profile for students
  if (user.role === 'STUDENT') {
    return <EnhancedStudentProfile />;
  }

  // Keep existing profile for admin and teachers
  return <LegacyProfilePage />;
}

function LegacyProfilePage() {
  const { user, getCurrentUser } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    qualification: '',
    experience: 0,
    specialization: '',
    designation: ''
  });
  const [myClasses, setMyClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        qualification: user.qualification || '',
        experience: user.experience || 0,
        specialization: user.specialization || '',
        designation: user.designation || ''
      });
      
      if (user.role === 'TEACHER') {
        fetchMyClasses();
      }
    }
  }, [user]);

  const fetchMyClasses = async () => {
    try {
      const response = await api.get('/class');
      setMyClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user?.role === 'STUDENT') {
        await api.put('/student/profile', profileData);
      } else if (user?.role === 'TEACHER') {
        await api.put('/teacher/profile', profileData);
      } else if (user?.role === 'ADMIN') {
        await api.put(`/admin/users/${user?.id}`, profileData);
      }
      
      toast.success('Profile updated successfully');
      setEditing(false);
      getCurrentUser();
    } catch (error: any) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-blue-100">{user.role === 'ADMIN' ? 'Administrator' : user.role === 'TEACHER' ? 'Teacher' : 'Student'} Profile</p>
            {user.employeeId && (
              <p className="text-blue-200 text-sm">Employee ID: {user.employeeId}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                <div className="flex space-x-3">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateProfile}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    user.role !== 'TEACHER' && (
                      <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Edit Profile
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!editing}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!editing}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    disabled={!editing}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <input
                    type="text"
                    value={user.role}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                  />
                </div>

                {/* Teacher-specific fields */}
                {user.role === 'TEACHER' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Qualification</label>
                      <input
                        type="text"
                        value={profileData.qualification}
                        disabled
                        placeholder="e.g., M.Sc. Mathematics, B.Tech CSE"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Experience (Years)</label>
                      <input
                        type="number"
                        value={profileData.experience}
                        disabled
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialization</label>
                      <input
                        type="text"
                        value={profileData.specialization}
                        disabled
                        placeholder="e.g., Mathematics, Physics, Computer Science"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Designation</label>
                      <input
                        type="text"
                        value={profileData.designation}
                        disabled
                        placeholder="e.g., Senior Teacher, Assistant Professor"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                      />
                    </div>
                  </>
                )}

                {user.role !== 'TEACHER' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      disabled={!editing}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                )}

                {/* Student-specific information */}
                {user.role === 'STUDENT' && user.studentProfile && (
                  <>
                    <div className="sm:col-span-2">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 mt-6">Student Information</h3>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                      <input
                        type="text"
                        value={user.studentProfile.rollNo}
                        disabled
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Class</label>
                      <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500">
                        {user.studentProfile.batch?.name}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              {user.role === 'TEACHER' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Classes</span>
                    <span className="text-lg font-semibold text-blue-600">{myClasses.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Students</span>
                    <span className="text-lg font-semibold text-green-600">
                      {myClasses.reduce((sum, cls) => sum + cls._count.students, 0)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* My Classes (for teachers) */}
          {user.role === 'TEACHER' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">My Classes</h3>
              </div>
              <div className="p-6">
                {myClasses.length > 0 ? (
                  <div className="space-y-3">
                    {myClasses.map((cls) => (
                      <div key={cls.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{cls.name}</h4>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {cls._count.students} students
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{cls.course} • Section {cls.section}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Subjects: {cls.subjects.join(', ')}
                        </p>
                        {cls.schedule && (
                          <p className="text-xs text-blue-600 mt-1">
                            Schedule: {cls.schedule}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No classes assigned yet
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-700 block mb-1">Member Since:</span>
                <p className="font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-700 block mb-1">Role:</span>
                <p className="font-medium text-gray-900">{user.role === 'ADMIN' ? 'Administrator' : user.role === 'TEACHER' ? 'Teacher' : 'Student'}</p>
              </div>
              {user.employeeId && (
                <div>
                  <span className="text-gray-700 block mb-1">Employee ID:</span>
                  <p className="font-medium text-gray-900">{user.employeeId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function EnhancedStudentProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [profileRes, attendanceRes] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/attendance')
      ]);

      const profileData = profileRes.data.data;
      setProfile(profileData);
      setAttendanceStats(attendanceRes.data.data.statistics);
    } catch (error) {
      toast.error('Failed to fetch profile data');
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

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold">{profile.user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{profile.user.name}</h1>
            <p className="text-blue-100 text-lg">{profile.class.name} - Section {profile.class.section}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Roll No: {profile.rollNo}
              </span>
              <span className="bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                {profile.class.course}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{attendanceStats?.attendancePercentage}%</div>
            <div className="text-blue-200 text-sm">Attendance Rate</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information - Read Only */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow-lg rounded-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.user.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.user.phone || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.rollNo}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.gender || 'N/A'}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 min-h-[80px]">
                    {profile.address || 'N/A'}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-6">Parent/Guardian Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent/Guardian Name</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.parentName || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent/Guardian Phone</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {profile.parentPhone || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-600 font-medium">Class & Section</p>
                    <p className="text-lg font-bold text-blue-800">{profile.class.name} - {profile.class.section}</p>
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
                    <p className="text-sm text-green-600 font-medium">Course</p>
                    <p className="text-lg font-bold text-green-800">{profile.class.course}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm-6 4a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-purple-600 font-medium">Academic Year</p>
                    <p className="text-lg font-bold text-purple-800">{profile.class.academicYear || '2024-25'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-600 font-medium">Admission Date</p>
                    <p className="text-lg font-bold text-orange-800">
                      {profile.admissionDate ? new Date(profile.admissionDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-3">Subjects Enrolled:</p>
              <div className="flex flex-wrap gap-2">
                {profile.class.subjects?.map((subject, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg font-medium"
                  >
                    {subject}
                  </span>
                )) || <span className="text-gray-500">No subjects assigned</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendance Stats */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Classes</span>
                <span className="text-lg font-bold text-blue-600">{attendanceStats?.totalClasses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Present</span>
                <span className="text-lg font-bold text-green-600">{attendanceStats?.totalPresent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Absent</span>
                <span className="text-lg font-bold text-red-600">{attendanceStats?.totalAbsent || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className={`text-lg font-bold ${
                  (attendanceStats?.attendancePercentage || 0) >= 80 ? 'text-green-600' :
                  (attendanceStats?.attendancePercentage || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {attendanceStats?.attendancePercentage || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Class Teacher Info */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Teacher</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">
                    {profile.class.teacher?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{profile.class.teacher?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{profile.class.teacher?.email || 'N/A'}</p>
                  {profile.class.teacher?.phone && (
                    <p className="text-sm text-gray-600">{profile.class.teacher.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Student ID</span>
                <span className="text-sm font-medium text-gray-900">{profile.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {profile.admissionDate ? new Date(profile.admissionDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                  }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
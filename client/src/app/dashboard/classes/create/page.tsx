'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  course: z.string().min(1, 'Course is required'),
  subjects: z.array(z.string().min(1, 'Subject cannot be empty')).min(1, 'At least one subject is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  section: z.string().min(1, 'Section is required'),
  description: z.string().optional(),
  schedule: z.string().optional(),
  teacherId: z.string().optional(),
  lectures: z.array(z.object({
    subject: z.string().min(1, 'Subject is required'),
    teacherId: z.string().min(1, 'Teacher is required for lecture'),
    duration: z.number().min(1, 'Duration must be at least 1 hour'),
    schedule: z.string().min(1, 'Schedule is required'),
  })).optional(),
});

type ClassForm = z.infer<typeof classSchema>;

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function CreateClassPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>(['']);
  const [lectures, setLectures] = useState<Array<{
    subject: string;
    teacherId: string;
    duration: number;
    schedule: string;
  }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ClassForm>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      subjects: subjects
    }
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
      setTeachers(response.data.data.users || []);
    } catch (error) {
      console.log('Failed to fetch teachers');
    }
  };

  const addLecture = () => {
    setLectures([...lectures, { subject: '', teacherId: '', duration: 2, schedule: '' }]);
  };

  const addSubject = () => setSubjects([...subjects, '']);
  const removeSubject = (index: number) => setSubjects(subjects.filter((_, i) => i !== index));
  const updateSubject = (index: number, value: string) => {
    const updated = [...subjects];
    updated[index] = value;
    setSubjects(updated);
  };

  const removeLecture = (index: number) => {
    setLectures(lectures.filter((_, i) => i !== index));
  };

  const updateLecture = (index: number, field: string, value: string | number) => {
    const updated = lectures.map((lecture, i) => 
      i === index ? { ...lecture, [field]: value } : lecture
    );
    setLectures(updated);
  };

  const onSubmit = async (data: ClassForm) => {
    const validSubjects = subjects.filter(s => s.trim());
    if (validSubjects.length === 0) {
      toast.error('At least one subject is required');
      return;
    }
    
    setLoading(true);
    try {
      const validLectures = lectures.filter(l => l.subject.trim() && l.teacherId.trim());
      
      const classData = {
        name: data.name,
        course: data.course,
        subjects: validSubjects,
        academicYear: data.academicYear,
        section: data.section,
        schedule: data.schedule || '',
        description: data.description || '',
        ...(data.teacherId && data.teacherId.trim() && { teacherId: data.teacherId }),
        ...(validLectures.length > 0 && { subjectTeachers: validLectures.map(l => ({ subject: l.subject, teacherId: l.teacherId })) })
      };
      
      const response = await api.post('/class', classData);
      toast.success('Class created successfully');
      router.push('/dashboard/classes');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    setValue('subjects', subjects.filter(s => s.trim()));
    handleSubmit(onSubmit)(e);
  };

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Class</h1>
          <p className="text-gray-600">Add a new class to the system</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/classes')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Back to Classes
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Mathematics"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course *
              </label>
              <input
                {...register('course')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Engineering, Science"
              />
              {errors.course && (
                <p className="mt-1 text-sm text-red-600">{errors.course.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subjects *
              </label>
              <div className="space-y-2">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => updateSubject(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Mathematics, Physics"
                    />
                    {subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSubject}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  + Add Subject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year *
              </label>
              <input
                {...register('academicYear')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., 2024-25, 2025"
              />
              {errors.academicYear && (
                <p className="mt-1 text-sm text-red-600">{errors.academicYear.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section *
              </label>
              <input
                {...register('section')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., A, B, C"
              />
              {errors.section && (
                <p className="mt-1 text-sm text-red-600">{errors.section.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule
              </label>
              <input
                {...register('schedule')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Mon,Wed,Fri 10:00-11:00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Teacher
              </label>
              <select
                {...register('teacherId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">No class teacher assigned</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter class description (optional)"
              />
            </div>
          </div>

          {/* Subject Teachers Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Subject Teachers</h3>
              <button
                type="button"
                onClick={addLecture}
                className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Add Subject Teacher
              </button>
            </div>
            
            {lectures.length === 0 ? (
              <p className="text-gray-500 text-sm">No subject teachers assigned. Click "Add Subject Teacher" to assign teachers to specific subjects.</p>
            ) : (
              <div className="space-y-4">
                {lectures.map((lecture, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Subject Assignment {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeLecture(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject *
                        </label>
                        <select
                          value={lecture.subject}
                          onChange={(e) => updateLecture(index, 'subject', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select Subject</option>
                          {subjects.filter(s => s.trim()).map((subject, idx) => (
                            <option key={idx} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject Teacher *
                        </label>
                        <select
                          value={lecture.teacherId}
                          onChange={(e) => updateLecture(index, 'teacherId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select Teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weekly Hours *
                        </label>
                        <select
                          value={lecture.duration}
                          onChange={(e) => updateLecture(index, 'duration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value={1}>1 Hour/Week</option>
                          <option value={2}>2 Hours/Week</option>
                          <option value={3}>3 Hours/Week</option>
                          <option value={4}>4 Hours/Week</option>
                          <option value={5}>5 Hours/Week</option>
                          <option value={6}>6 Hours/Week</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Schedule *
                        </label>
                        <input
                          type="text"
                          value={lecture.schedule}
                          onChange={(e) => updateLecture(index, 'schedule', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="e.g., Mon,Wed,Fri 10:00-11:00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push('/dashboard/classes')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Class'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
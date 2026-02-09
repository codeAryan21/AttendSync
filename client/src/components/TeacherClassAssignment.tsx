'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface TeacherClassAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTeacher?: Teacher;
}

export default function TeacherClassAssignment({ isOpen, onClose, onSuccess, selectedTeacher }: TeacherClassAssignmentProps) {
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedTeacher) {
      fetchAvailableClasses();
    }
  }, [isOpen, selectedTeacher]);

  const fetchAvailableClasses = async () => {
    if (!selectedTeacher) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/admin/classes/available?teacherId=${selectedTeacher.id}`);
      const data = response.data.data;
      
      const allClasses = [
        ...(data.availableClasses || []),
        ...(data.assignedClasses || []),
        ...(data.otherAssignedClasses || [])
      ];
      
      setAvailableClasses(allClasses);
      setSelectedClasses((data.assignedClasses || []).map((cls: any) => cls.id));
    } catch (error) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;
    
    setLoading(true);
    try {
      await api.put(`/admin/users/${selectedTeacher.id}/classes`, {
        classIds: selectedClasses
      });
      toast.success('Class assignments updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to update class assignments');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Manage Class Assignments</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedTeacher && (
            <p className="text-purple-100 text-sm mt-1">Teacher: {selectedTeacher.name}</p>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Select classes to assign to this teacher:</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {availableClasses.length > 0 ? (
                  availableClasses.map((cls, index) => (
                    <label
                      key={cls.id}
                      className={`flex items-center p-4 hover:bg-purple-50 cursor-pointer transition-colors ${
                        index !== availableClasses.length - 1 ? 'border-b border-gray-200' : ''
                      }`}
                    >
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
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-900">{cls.name}</span>
                            <span className="text-sm text-gray-600 ml-2">Section {cls.section}</span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {cls._count?.students || 0} students
                          </span>
                        </div>
                        {cls.teacher && cls.teacherId !== selectedTeacher?.id && (
                          <p className="text-xs text-orange-600 mt-1">
                            Currently assigned to: {cls.teacher.name}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No classes available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

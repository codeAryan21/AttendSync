import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  entityName: string;
  createPath?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  buttonColor?: string;
  showCreateButton?: boolean;
}

export default function PageHeader({
  title,
  entityName,
  createPath,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  buttonColor = 'purple',
  showCreateButton = true
}: PageHeaderProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const buttonColors = {
    purple: 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-500',
    green: 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
    blue: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {showCreateButton && user?.role === 'ADMIN' && createPath && (
          <button 
            onClick={() => router.push(createPath)}
            className={`text-white px-4 py-2 rounded-md transition-colors ${buttonColors[buttonColor as keyof typeof buttonColors]}`}
          >
            Add New {entityName}
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${buttonColor}-500`}
        />
      </div>
    </div>
  );
}
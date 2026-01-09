interface LoadingSpinnerProps {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ color = 'purple', size = 'md' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex justify-center py-8">
      <div className={`animate-spin rounded-full border-b-2 border-${color}-600 ${sizes[size]}`}></div>
    </div>
  );
}
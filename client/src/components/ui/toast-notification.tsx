import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToastNotificationProps = {
  message: string;
  onClose: () => void;
};

export function ToastNotification({ message, onClose }: ToastNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center items-center pointer-events-none z-50">
      <div className="bg-warning text-black px-4 py-2 rounded-lg shadow-lg flex items-center max-w-xs mx-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
        <Bell className="h-5 w-5 mr-2" />
        <span className="font-medium">{message}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 ml-2 text-black hover:bg-warning/20" 
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Toast as ToastType } from '../types';

interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast ${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
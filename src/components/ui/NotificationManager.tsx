import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const NotificationManager: React.FC = () => {
  const { state, removeNotification } = useGlobalState();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-success" />;
      case 'error':
        return <AlertCircle size={20} className="text-error" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-warning" />;
      case 'info':
      default:
        return <Info size={20} className="text-info" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success text-success';
      case 'error':
        return 'bg-error/10 border-error text-error';
      case 'warning':
        return 'bg-warning/10 border-warning text-warning';
      case 'info':
      default:
        return 'bg-info/10 border-info text-info';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {state.notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.3 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`p-4 rounded-lg border-2 shadow-lg hand-drawn ${getStyles(notification.type)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-body">
                  {notification.message}
                </p>
                
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className="mt-2 text-xs font-semibold underline hover:no-underline"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 ml-3 text-current hover:opacity-75"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationManager;</parameter>
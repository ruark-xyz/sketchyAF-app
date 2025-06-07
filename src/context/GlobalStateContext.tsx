import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Global application state interface
interface GlobalState {
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  notifications: Notification[];
  theme: 'light' | 'dark';
  isOnline: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Action types
type GlobalAction =
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' };

// Initial state
const initialState: GlobalState = {
  isLoading: false,
  loadingMessage: '',
  error: null,
  notifications: [],
  theme: 'light',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

// Reducer
function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || '',
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };

    default:
      return state;
  }
}

// Context interface
interface GlobalContextType {
  state: GlobalState;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// Create context
const GlobalStateContext = createContext<GlobalContextType | undefined>(undefined);

// Provider component
export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {};

    state.notifications.forEach(notification => {
      if (notification.duration && !timeouts[notification.id]) {
        timeouts[notification.id] = setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
          delete timeouts[notification.id];
        }, notification.duration);
      }
    });

    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [state.notifications]);

  // Action creators
  const setLoading = (isLoading: boolean, message?: string) => {
    dispatch({ type: 'SET_LOADING', payload: { isLoading, message } });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: { 
        ...notification, 
        id,
        duration: notification.duration || 5000 
      } 
    });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    localStorage.setItem('theme', theme);
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const value = {
    state,
    setLoading,
    setError,
    addNotification,
    removeNotification,
    clearAllNotifications,
    setTheme,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};

// Hook to use global state
export const useGlobalState = (): GlobalContextType => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

export default GlobalStateContext;
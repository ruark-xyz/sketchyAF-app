// Test Setup File
// Global test configuration and mocks for real-time functionality testing

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables for testing
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_PUBNUB_PUBLISH_KEY: 'test-publish-key',
    VITE_PUBNUB_SUBSCRIBE_KEY: 'test-subscribe-key',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  },
  writable: true
});

// Mock PubNub globally
vi.mock('pubnub', () => {
  const createMockPubNub = () => ({
    publish: vi.fn().mockResolvedValue({ timetoken: '12345' }),
    channel: vi.fn().mockReturnValue({
      subscription: vi.fn().mockReturnValue({
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        onMessage: vi.fn(),
        onPresence: vi.fn()
      })
    }),
    hereNow: vi.fn().mockResolvedValue({
      channels: {
        'game-test': {
          occupants: [{ uuid: 'user1' }, { uuid: 'user2' }]
        }
      }
    }),
    addListener: vi.fn(),
    unsubscribeAll: vi.fn(),
    stop: vi.fn()
  });

  return {
    default: createMockPubNub
  };
});

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        }
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-game', status: 'waiting' }
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'test-id' }]
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    }),
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: null
    })
  }
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test' }),
  Link: ({ children, to }: any) => {
    return { type: 'a', props: { href: to, children } };
  }
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2023-01-01T00:00:00Z'
    },
    isLoggedIn: true,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  }),
  AuthProvider: ({ children }: any) => children
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Console error suppression for expected test errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

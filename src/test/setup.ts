// Test Setup File
// Global test configuration and mocks for real-time functionality testing

import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

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

// Mock Canvas API for Excalidraw compatibility
global.Path2D = vi.fn().mockImplementation(() => ({
  addPath: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  closePath: vi.fn(),
  ellipse: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  rect: vi.fn(),
}));

global.CanvasRenderingContext2D = vi.fn().mockImplementation(() => ({
  arc: vi.fn(),
  arcTo: vi.fn(),
  beginPath: vi.fn(),
  bezierCurveTo: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  createLinearGradient: vi.fn(),
  createPattern: vi.fn(),
  createRadialGradient: vi.fn(),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  getLineDash: vi.fn(() => []),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  lineTo: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  moveTo: vi.fn(),
  putImageData: vi.fn(),
  quadraticCurveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeRect: vi.fn(),
  strokeText: vi.fn(),
  transform: vi.fn(),
  translate: vi.fn(),
}));

// Mock HTMLCanvasElement
global.HTMLCanvasElement = vi.fn().mockImplementation(() => ({
  getContext: vi.fn(() => new global.CanvasRenderingContext2D()),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  toBlob: vi.fn((callback) => callback(new Blob(['mock'], { type: 'image/png' }))),
  width: 800,
  height: 600,
}));

// Mock OffscreenCanvas for advanced Canvas features
global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
  getContext: vi.fn(() => new global.CanvasRenderingContext2D()),
  convertToBlob: vi.fn(() => Promise.resolve(new Blob(['mock'], { type: 'image/png' }))),
  width: 800,
  height: 600,
}));

// Mock additional Canvas-related APIs that Excalidraw might use
global.ImageData = vi.fn().mockImplementation((width, height) => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
}));

global.DOMMatrix = vi.fn().mockImplementation(() => ({
  a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
  inverse: vi.fn(() => new global.DOMMatrix()),
  multiply: vi.fn(() => new global.DOMMatrix()),
  scale: vi.fn(() => new global.DOMMatrix()),
  translate: vi.fn(() => new global.DOMMatrix()),
  transformPoint: vi.fn(() => ({ x: 0, y: 0 })),
}));

// Mock createImageBitmap for image handling
global.createImageBitmap = vi.fn(() =>
  Promise.resolve({
    width: 100,
    height: 100,
    close: vi.fn(),
  })
);

// Mock URL.createObjectURL and revokeObjectURL for blob handling
global.URL = global.URL || {};
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Excalidraw components to prevent Canvas API calls in tests
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: vi.fn(({ excalidrawAPI, children, ...props }) => {
    // Call the API callback with a mock API if provided
    if (excalidrawAPI && typeof excalidrawAPI === 'function') {
      excalidrawAPI({
        updateScene: vi.fn(),
        addFiles: vi.fn(),
        scrollToContent: vi.fn(),
        getSceneElements: vi.fn(() => []),
        getAppState: vi.fn(() => ({})),
        getFiles: vi.fn(() => ({})),
        refresh: vi.fn(),
        setToast: vi.fn(),
        id: 'mock-excalidraw-id',
        getSceneElementsIncludingDeleted: vi.fn(() => []),
        history: {
          clear: vi.fn(),
        },
        setActiveTool: vi.fn(),
        setCursor: vi.fn(),
        resetCursor: vi.fn(),
        toggleSidebar: vi.fn(),
      });
    }
    return React.createElement('div', {
      'data-testid': 'excalidraw-mock',
      ...props
    }, children);
  }),
  exportToBlob: vi.fn(() => Promise.resolve(new Blob(['mock-image'], { type: 'image/png' }))),
  exportToSvg: vi.fn(() => Promise.resolve({
    outerHTML: '<svg>mock-svg</svg>'
  })),
  exportToCanvas: vi.fn(() => Promise.resolve(new global.HTMLCanvasElement())),
  serializeAsJSON: vi.fn(() => '{"elements":[],"appState":{}}'),
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

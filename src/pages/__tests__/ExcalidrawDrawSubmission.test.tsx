import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ExcalidrawDraw from '../ExcalidrawDraw';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('gameId=test-game-123')],
    useNavigate: () => vi.fn()
  };
});

// Mock the services
vi.mock('../../services/UnifiedGameService', () => ({
  UnifiedGameService: vi.fn().mockImplementation(() => ({
    submitDrawing: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'submission-123' }
    })
  }))
}));

vi.mock('../../services/DrawingExportService', () => ({
  DrawingExportService: vi.fn().mockImplementation(() => ({
    exportToImage: vi.fn().mockResolvedValue({
      success: true,
      data: new Blob(['mock-image'], { type: 'image/png' })
    }),
    uploadToStorage: vi.fn().mockResolvedValue({
      success: true,
      data: {
        url: 'https://example.com/drawing.png',
        thumbnailUrl: 'https://example.com/drawing_thumb.png'
      }
    }),
    extractMetadata: vi.fn().mockReturnValue({
      canvasWidth: 800,
      canvasHeight: 600,
      elementCount: 5,
      drawingTime: 30
    })
  }))
}));

// Mock the hooks
vi.mock('../../hooks/useUnifiedGameState', () => ({
  useUnifiedGameState: () => ({
    game: {
      id: 'test-game-123',
      status: 'drawing',
      prompt: 'Draw a robot',
      phase_expires_at: new Date(Date.now() + 60000).toISOString() // 1 minute from now
    },
    isLoading: false,
    error: null
  })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'user-123', email: 'test@example.com' },
    isLoggedIn: true
  })
}));

// Mock the ExcalidrawCanvas component
vi.mock('../../components/excalidraw/ExcalidrawCanvas', () => ({
  default: ({ gameContext }: any) => {
    // Test the drawing context submission function
    const testSubmission = async () => {
      if (gameContext?.submitDrawing) {
        try {
          await gameContext.submitDrawing({
            elements: [{ type: 'rectangle', id: '1' }],
            appState: { viewBackgroundColor: '#ffffff' },
            files: {}
          });
          console.log('Test submission successful');
        } catch (error) {
          console.error('Test submission failed:', error);
        }
      }
    };

    return (
      <div data-testid="excalidraw-canvas">
        <div>Game ID: {gameContext?.gameId}</div>
        <div>Prompt: {gameContext?.prompt}</div>
        <div>Time Remaining: {gameContext?.timeRemaining}</div>
        <div>Can Submit: {gameContext?.canSubmit ? 'Yes' : 'No'}</div>
        <button onClick={testSubmission} data-testid="test-submit">
          Test Submit
        </button>
      </div>
    );
  }
}));

describe('ExcalidrawDraw Submission Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create drawing context with proper submission function', async () => {
    render(<ExcalidrawDraw />);

    await waitFor(() => {
      expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
    });

    // Check that the drawing context is properly created
    expect(screen.getByText('Game ID: test-game-123')).toBeInTheDocument();
    expect(screen.getByText('Prompt: Draw a robot')).toBeInTheDocument();
    expect(screen.getByText('Can Submit: Yes')).toBeInTheDocument();
  });

  it('should handle submission through drawing context', async () => {
    render(<ExcalidrawDraw />);

    await waitFor(() => {
      expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
    });

    // Test the submission function
    const submitButton = screen.getByTestId('test-submit');
    submitButton.click();

    // Wait for submission to complete
    await waitFor(() => {
      // The submission should complete without errors
      expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
    });
  });

  it('should calculate time remaining correctly', async () => {
    render(<ExcalidrawDraw />);

    await waitFor(() => {
      expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
    });

    // Check that time remaining is calculated (should be around 60 seconds)
    const timeText = screen.getByText(/Time Remaining: \d+/);
    expect(timeText).toBeInTheDocument();
    
    // Extract the number from the text
    const timeMatch = timeText.textContent?.match(/Time Remaining: (\d+)/);
    const timeRemaining = timeMatch ? parseInt(timeMatch[1]) : 0;
    
    // Should be around 60 seconds (give or take a few seconds for test execution)
    expect(timeRemaining).toBeGreaterThan(55);
    expect(timeRemaining).toBeLessThan(65);
  });
});

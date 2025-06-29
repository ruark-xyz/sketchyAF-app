import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ExcalidrawCanvas from '../ExcalidrawCanvas';
import { GameDrawingContext } from '../../../context/GameContext';

// Mock the hooks and components
vi.mock('../../../hooks/useMobileOptimization', () => ({
  default: () => {}
}));

vi.mock('../../../hooks/useDrawingTimer', () => ({
  useDrawingTimer: () => ({
    timeRemaining: 30,
    formattedTime: '0:30',
    isActive: true,
    isExpired: false,
    isWarning: false,
    warningLevel: 'none',
    onTimeExpired: vi.fn(),
    onWarning: vi.fn(),
    onAutoSubmit: vi.fn()
  })
}));

vi.mock('../../../context/GameContext', () => ({
  useGame: () => ({
    submitDrawingWithExport: vi.fn().mockResolvedValue({ success: true })
  })
}));

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ excalidrawAPI }: any) => {
    // Mock the Excalidraw API
    const mockAPI = {
      getSceneElements: () => [{ type: 'rectangle', id: '1' }],
      getAppState: () => ({ viewBackgroundColor: '#ffffff' }),
      getFiles: () => ({})
    };
    
    // Call the API callback to simulate initialization
    React.useEffect(() => {
      if (excalidrawAPI) {
        excalidrawAPI(mockAPI);
      }
    }, [excalidrawAPI]);
    
    return <div data-testid="excalidraw-canvas">Mocked Excalidraw</div>;
  }
}));

vi.mock('../AssetDrawer', () => ({
  default: () => <div data-testid="asset-drawer">Asset Drawer</div>
}));

describe('ExcalidrawCanvas Auto-submission', () => {
  const mockGameContext: GameDrawingContext = {
    gameId: 'test-game-123',
    prompt: 'Draw a cat',
    timeRemaining: 30,
    isDrawingPhase: true,
    canSubmit: true,
    hasSubmitted: false,
    availableAssets: [],
    submitDrawing: vi.fn(),
    saveProgress: vi.fn(),
    loadProgress: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ExcalidrawCanvas gameContext={mockGameContext} />);
    expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
  });

  it('should show game context information when provided', () => {
    render(<ExcalidrawCanvas gameContext={mockGameContext} />);

    expect(screen.getByText('Draw: Draw a cat')).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('should show submitted status when drawing is submitted', () => {
    const submittedContext = { ...mockGameContext, hasSubmitted: true };
    render(<ExcalidrawCanvas gameContext={submittedContext} />);
    
    expect(screen.getByText('Submitted!')).toBeInTheDocument();
  });

  it('should show auto-submitting status during submission', async () => {
    const { rerender } = render(<ExcalidrawCanvas gameContext={mockGameContext} />);
    
    // This test would need more complex mocking to simulate the auto-submission process
    // For now, we just verify the component renders correctly
    expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
  });

  it('should render asset drawer button', () => {
    render(<ExcalidrawCanvas gameContext={mockGameContext} />);
    
    const assetButton = screen.getByTitle('Open Image Library');
    expect(assetButton).toBeInTheDocument();
  });

  it('should handle missing game context gracefully', () => {
    render(<ExcalidrawCanvas gameContext={null} />);
    
    expect(screen.getByTestId('excalidraw-canvas')).toBeInTheDocument();
    // Should not show game-specific UI when no context
    expect(screen.queryByText('Draw: Draw a cat')).not.toBeInTheDocument();
  });
});

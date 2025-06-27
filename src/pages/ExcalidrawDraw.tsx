import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Seo from '../components/utils/Seo';
import { useAuth } from '../context/AuthContext';
import { useUnifiedGameState } from '../hooks/useUnifiedGameState';
import { GameDrawingContext } from '../context/GameContext';
import { UnifiedGameService } from '../services/UnifiedGameService';
import { DrawingExportService } from '../services/DrawingExportService';

// Dynamic import to avoid loading Excalidraw on initial bundle
const ExcalidrawCanvas = React.lazy(() => import('../components/excalidraw/ExcalidrawCanvas'));

const ExcalidrawDraw = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();

  // Use unified game state for loading game data
  // Navigation is handled by the DrawingRoute wrapper, so disable auto-navigation here
  const {
    game: currentGame,
    isLoading: gameLoading,
    error: gameError
  } = useUnifiedGameState({
    autoNavigate: false, // Navigation handled by DrawingRoute wrapper
    gameId: searchParams.get('gameId') || undefined
  });

  const gameId = searchParams.get('gameId');

  // Create unified game service instance
  const unifiedGameService = useRef<UnifiedGameService | null>(null);
  const drawingExportService = useRef<DrawingExportService | null>(null);

  // Initialize services
  useEffect(() => {
    if (!unifiedGameService.current) {
      unifiedGameService.current = new UnifiedGameService();
    }
    if (!drawingExportService.current) {
      drawingExportService.current = new DrawingExportService();
    }
  }, []);

  // Create drawing context directly from unified game state
  const drawingContext = useMemo((): GameDrawingContext | null => {
    if (!currentGame || !gameId || !currentUser) {
      return null;
    }

    // Calculate time remaining based on phase expiration
    let timeRemaining = 0;
    if (currentGame.phase_expires_at) {
      const expirationTime = new Date(currentGame.phase_expires_at).getTime();
      const currentTime = Date.now();
      timeRemaining = Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
    }

    return {
      gameId,
      prompt: currentGame.prompt,
      timeRemaining,
      isDrawingPhase: currentGame.status === 'drawing',
      canSubmit: currentGame.status === 'drawing',
      hasSubmitted: false, // TODO: Check actual submission status
      availableAssets: [],
      submitDrawing: async (drawingData: { elements: any[], appState: any, files: any }) => {
        if (!unifiedGameService.current || !drawingExportService.current) {
          throw new Error('Services not initialized');
        }

        console.log('Submitting drawing with data:', drawingData);

        try {
          // Export drawing to image
          const exportResult = await drawingExportService.current.exportToImage(
            drawingData.elements,
            drawingData.appState,
            { format: 'png', scale: 1 },
            drawingData.files
          );

          if (!exportResult.success || !exportResult.data) {
            throw new Error(exportResult.error || 'Failed to export drawing');
          }

          // Upload to storage
          const uploadResult = await drawingExportService.current.uploadToStorage(
            exportResult.data,
            gameId,
            currentUser.id,
            { generateThumbnail: true }
          );

          if (!uploadResult.success || !uploadResult.data) {
            throw new Error(uploadResult.error || 'Failed to upload drawing');
          }

          // Extract metadata
          const metadata = drawingExportService.current.extractMetadata(
            drawingData.elements,
            drawingData.appState,
            timeRemaining, // Use remaining time as drawing time for now
            exportResult.data.size,
            'png'
          );

          // Submit to database
          const submissionResult = await unifiedGameService.current.submitDrawing({
            game_id: gameId,
            drawing_data: drawingData,
            drawing_url: uploadResult.data.url,
            drawing_thumbnail_url: uploadResult.data.thumbnailUrl,
            canvas_width: metadata.canvasWidth,
            canvas_height: metadata.canvasHeight,
            element_count: metadata.elementCount,
            drawing_time_seconds: metadata.drawingTime
          });

          if (!submissionResult.success) {
            throw new Error(submissionResult.error || 'Failed to submit drawing');
          }

          console.log('Drawing submitted successfully:', submissionResult.data);
        } catch (error) {
          console.error('Failed to submit drawing:', error);
          throw error;
        }
      },
      saveProgress: async (drawingData: any) => {
        // TODO: Implement progress saving
        console.log('Save progress:', drawingData);
      },
      loadProgress: async () => {
        // TODO: Implement progress loading
        return null;
      }
    };
  }, [currentGame, gameId, currentUser]);

  // Handle authentication and navigation
  useEffect(() => {
    if (!gameLoading) {
      if (!gameId || !isLoggedIn || !currentUser) {
        if (!isLoggedIn && gameId) {
          console.log('User not authenticated, redirecting to login');
          navigate('/uiux/login');
        } else if (!gameId && isLoggedIn) {
          // No game ID provided, redirect to lobby
          navigate('/uiux/lobby');
        }
        return;
      }

      if (!currentGame && !gameLoading) {
        // Game not found and not loading
        console.log('Game not found:', gameId);
      }
    }
  }, [gameId, isLoggedIn, currentUser, gameLoading, currentGame, navigate]);

  // Navigation is now handled entirely by the DrawingRoute wrapper

  // Show loading state
  if (gameLoading) {
    return (
      <>
        <Seo
          title="Loading Game - SketchyAF"
          description="Joining drawing game..."
        />
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Joining game...</p>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (gameError) {
    return (
      <>
        <Seo
          title="Game Error - SketchyAF"
          description="Failed to load drawing game"
        />
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Game Error</h2>
            <p className="text-gray-600 mb-4">{gameError}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </>
    );
  }

  // Show game not found state
  if (!currentGame) {
    return (
      <>
        <Seo
          title="Game Not Found - SketchyAF"
          description="The requested game could not be found"
        />
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🎮</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Game Not Found</h2>
            <p className="text-gray-600 mb-4">The game you're looking for doesn't exist or has ended.</p>
            <button
              onClick={() => navigate('/uiux/lobby')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Find Another Game
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title={`Drawing: ${currentGame.prompt} - SketchyAF`}
        description={`Draw your interpretation of "${currentGame.prompt}" in this multiplayer drawing game`}
      />
      <div className="min-h-screen bg-white">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading drawing canvas...</p>
            </div>
          </div>
        }>
          <ExcalidrawCanvas gameContext={drawingContext} />
        </Suspense>

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded z-50">
            <div>Game: {currentGame?.id}</div>
            <div>Status: {currentGame?.status}</div>
            <div>Drawing Context: {drawingContext ? 'Yes' : 'No'}</div>
            <div>Time Remaining: {drawingContext?.timeRemaining || 0}s</div>
          </div>
        )}
      </div>
    </>
  );
};

export default ExcalidrawDraw; 
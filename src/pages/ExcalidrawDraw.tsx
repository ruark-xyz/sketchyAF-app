import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Seo from '../components/utils/Seo';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

// Dynamic import to avoid loading Excalidraw on initial bundle
const ExcalidrawCanvas = React.lazy(() => import('../components/excalidraw/ExcalidrawCanvas'));

const ExcalidrawDraw = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();
  const {
    currentGame,
    drawingContext,
    joinGame,
    initializeDrawingSession,
    isLoading,
    error
  } = useGame();

  const [isInitializing, setIsInitializing] = useState(true);
  const gameId = searchParams.get('gameId');

  // Initialize game session
  useEffect(() => {
    const initializeGame = async () => {
      if (!isLoggedIn || !currentUser) {
        navigate('/uiux/login');
        return;
      }

      if (!gameId) {
        // No game ID provided, redirect to lobby or game creation
        navigate('/uiux/lobby');
        return;
      }

      try {
        setIsInitializing(true);

        // Join game if not already joined
        if (!currentGame || currentGame.id !== gameId) {
          const result = await joinGame(gameId);
          if (!result.success) {
            console.error('Failed to join game:', result.error);
            navigate('/');
            return;
          }
        }

        // Initialize drawing session if in drawing phase
        if (currentGame?.status === 'drawing' && !drawingContext) {
          await initializeDrawingSession(gameId);
        }
      } catch (err) {
        console.error('Failed to initialize game:', err);
        navigate('/');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeGame();
  }, [gameId, isLoggedIn, currentUser, currentGame, drawingContext, joinGame, initializeDrawingSession, navigate]);

  // Show loading state
  if (isInitializing || isLoading) {
    return (
      <>
        <Seo
          title="Loading Game - SketchyAF"
          description="Joining drawing game..."
        />
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isInitializing ? 'Joining game...' : 'Loading drawing canvas...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
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
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return Home
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
              onClick={() => navigate('/')}
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
      </div>
    </>
  );
};

export default ExcalidrawDraw; 
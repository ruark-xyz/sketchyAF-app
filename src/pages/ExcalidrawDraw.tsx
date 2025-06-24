import React, { Suspense, useEffect, useState, useRef } from 'react';
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
    createGame,
    transitionGameStatus,
    initializeDrawingSession,
    isLoading,
    error
  } = useGame();

  const [isInitializing, setIsInitializing] = useState(true);
  const gameId = searchParams.get('gameId');
  const initializationRef = useRef<string | null>(null);

  // Store functions in refs to avoid dependency issues
  const functionsRef = useRef({
    joinGame,
    createGame,
    transitionGameStatus,
    initializeDrawingSession,
    navigate
  });

  // Update refs when functions change
  functionsRef.current = {
    joinGame,
    createGame,
    transitionGameStatus,
    initializeDrawingSession,
    navigate
  };

  // Debug logging (only on first load)
  if (!currentGame && gameId && !initializationRef.current) {
    console.log('ExcalidrawDraw: Loading game', gameId);
  }

  // Initialize game session
  useEffect(() => {
    // Skip if auth is still loading
    if (isLoading) {
      return;
    }

    // Only initialize if we have the required auth state and gameId
    if (!gameId || !isLoggedIn || !currentUser) {
      if (!isLoggedIn && gameId) {
        console.log('User not authenticated, redirecting to login');
        functionsRef.current.navigate('/uiux/login');
      } else if (!gameId && isLoggedIn) {
        // No game ID provided, redirect to lobby or game creation
        functionsRef.current.navigate('/uiux/lobby');
      }
      return;
    }

    const initializeGame = async () => {
      // Prevent duplicate initialization for the same gameId
      if (initializationRef.current === gameId) {
        console.log('Initialization already in progress for gameId:', gameId);
        return;
      }

      // For test games, check if we already have a valid game
      const isTestGame = gameId?.startsWith('test') || false;
      if (isTestGame && currentGame && gameId && currentGame.prompt.includes(`Test Drawing Session - ${gameId}`)) {
        console.log('Test game already exists and is valid, skipping initialization');
        // Don't reset the ref here - keep it to prevent re-initialization
        return;
      }

      initializationRef.current = gameId;
      console.log('Starting game initialization for gameId:', gameId);

      try {
        setIsInitializing(true);

        // Check if this is a test game (gameId starts with "test")
        const isTestGame = gameId.startsWith('test');
        let actualGameId = gameId; // Track the actual game ID to use

        if (isTestGame) {
          console.log('Development test mode detected for gameId:', gameId);

          // Check if we already have a valid test game
          if (currentGame && currentGame.prompt.includes(`Test Drawing Session - ${gameId}`)) {
            console.log('Test game already exists, using existing game:', currentGame.id);
            actualGameId = currentGame.id;
          } else {
            // For test games, we always create a new game since test IDs are not valid UUIDs
            // and cannot exist in the database
            console.log('Creating new test game...');

            // Create a new test game (minimum 2 players due to database constraints)
            const createResult = await functionsRef.current.createGame(`Test Drawing Session - ${gameId}`, {
              maxPlayers: 2,
              roundDuration: 60, // 1 minute for testing
              votingDuration: 30
            });

            if (createResult.success && createResult.data) {
            console.log('Test game created successfully:', createResult.data.id);

            // Update the actual game ID to use
            actualGameId = createResult.data.id;

            // Update URL to use the actual game ID
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('gameId', actualGameId);
            window.history.replaceState({}, '', newUrl.toString());

            // Set the game to drawing status immediately for testing
            // Wait a bit for the GameContext to update with the new game
            console.log('Waiting for game context to update...');
            setTimeout(async () => {
              try {
                // First transition to briefing, then to drawing (following the game flow)
                const briefingResult = await functionsRef.current.transitionGameStatus('briefing');
                if (briefingResult.success) {
                  const drawingResult = await functionsRef.current.transitionGameStatus('drawing');
                  if (!drawingResult.success) {
                    console.warn('Failed to transition test game to drawing status:', drawingResult.error);
                  } else {
                    console.log('Test game successfully transitioned to drawing status');
                  }
                } else {
                  console.warn('Failed to transition test game to briefing status:', briefingResult.error);
                }
              } catch (error) {
                console.error('Error during game status transitions:', error);
              }
            }, 2000); // Wait 2 seconds for the context to update
          } else {
            console.error('Failed to create test game:', createResult.error);
            functionsRef.current.navigate('/');
            return;
            }
          }
        } else {
          // Regular game flow - join existing game
          if (!currentGame || currentGame.id !== gameId) {
            const result = await functionsRef.current.joinGame(gameId);
            if (!result.success) {
              console.error('Failed to join game:', result.error);
              functionsRef.current.navigate('/');
              return;
            }
          }
        }

        // Initialize drawing session if in drawing phase
        // Use actualGameId which will be the created game ID for test games
        if (currentGame?.status === 'drawing' && !drawingContext) {
          await functionsRef.current.initializeDrawingSession(actualGameId);
        }
      } catch (err) {
        console.error('Failed to initialize game:', err);
        initializationRef.current = null; // Reset on error
        functionsRef.current.navigate('/');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeGame();

    // Don't reset the ref on cleanup - we want to prevent re-initialization
    return () => {
      // Cleanup function - but don't reset initializationRef to prevent duplicate initialization
    };
  }, [gameId, isLoggedIn, currentUser, isLoading]); // Removed currentGame and drawingContext to prevent infinite loop

  // Show loading state (only for initialization, not auth loading)
  if (isInitializing) {
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
              onClick={() => functionsRef.current.navigate('/')}
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
              onClick={() => functionsRef.current.navigate('/')}
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
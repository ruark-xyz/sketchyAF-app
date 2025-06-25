import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import ExcalidrawDraw from './pages/ExcalidrawDraw';
import Premium from './pages/Premium';
import Leaderboard from './pages/Leaderboard';
import ArtGallery from './pages/ArtGallery';
import ArtDetail from './pages/ArtDetail';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Login from './pages/uiux/Login';
import Signup from './pages/uiux/Signup';
import ForgotPassword from './pages/uiux/ForgotPassword';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import BoosterPackDetail from './pages/BoosterPackDetail';
import Roadmap from './pages/Roadmap';
import RoadmapDetail from './pages/RoadmapDetail';
import LobbyScreen from './pages/uiux/LobbyScreen';
import PreRoundBriefingScreen from './pages/uiux/PreRoundBriefingScreen';
import VotingScreen from './pages/uiux/VotingScreen';
import ResultsScreen from './pages/uiux/ResultsScreen';
import PostGameScreen from './pages/uiux/PostGameScreen';
import AuthCallback from './pages/auth/AuthCallback';
import ResetPassword from './pages/auth/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Seo from './components/utils/Seo';
import ScrollToTop from './components/utils/ScrollToTop';

function App() {
  return (
    <Router>
      {/* ScrollToTop component to handle scrolling to top on route change */}
      <ScrollToTop />
      
      {/* Default SEO that will be overridden by page-specific SEO */}
      <Seo 
        title="SketchyAF - The Wildly Entertaining Drawing Game"
        description="SketchyAF is a weird, wildly entertaining drawing game perfect for killing time anywhere. Join 60-second rounds of frantic drawing and fun!"
      />
      
      {/* Wrap entire app with AuthProvider and GameProvider */}
      <AuthProvider>
        <GameProvider>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/art" element={<ArtGallery />} />
              <Route path="/art/:drawingId" element={<ArtDetail />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/user/:username" element={<UserProfile />} />
              <Route path="/booster-packs/:packId" element={<BoosterPackDetail />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/roadmap/:itemId" element={<RoadmapDetail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* Protected Routes - Require Authentication */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/draw" element={
                <ProtectedRoute>
                  <ExcalidrawDraw />
                </ProtectedRoute>
              } />

              {/* Game Flow Routes */}
              <Route path="/uiux/login" element={
                <ProtectedRoute requireAuth={false} redirectTo="/">
                  <Login />
                </ProtectedRoute>
              } />
              
              <Route path="/uiux/signup" element={
                <ProtectedRoute requireAuth={false} redirectTo="/">
                  <Signup />
                </ProtectedRoute>
              } />
              
              <Route path="/uiux/forgot-password" element={
                <ProtectedRoute requireAuth={false} redirectTo="/">
                  <ForgotPassword />
                </ProtectedRoute>
              } />
              
              {/* Game Flow - Protected and Requires Game Context */}
              <Route path="/uiux/lobby" element={
                <ProtectedRoute>
                  <LobbyScreen />
                </ProtectedRoute>
              } />
              
              <Route path="/uiux/pre-round" element={
                <ProtectedRoute>
                  <GamePhaseRoute requiredPhase="briefing" fallbackPath="/uiux/lobby">
                    <PreRoundBriefingScreen />
                  </GamePhaseRoute>
                </ProtectedRoute>
              } />

              <Route path="/uiux/draw" element={
                <ProtectedRoute>
                  <GamePhaseRoute requiredPhase="drawing" fallbackPath="/uiux/lobby">
                    <ExcalidrawDraw />
                  </GamePhaseRoute>
                </ProtectedRoute>
              } />

              <Route path="/uiux/voting" element={
                <ProtectedRoute>
                  <GamePhaseRoute requiredPhase="voting" fallbackPath="/uiux/lobby">
                    <VotingScreen />
                  </GamePhaseRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/uiux/results" element={
                <ProtectedRoute>
                  <GamePhaseRoute requiredPhase="results" fallbackPath="/uiux/lobby">
                    <ResultsScreen />
                  </GamePhaseRoute>
                </ProtectedRoute>
              } />
              
              <Route path="/uiux/post-game" element={
                <ProtectedRoute>
                  <GamePhaseRoute requiredPhase="completed" fallbackPath="/uiux/lobby">
                    <PostGameScreen />
                  </GamePhaseRoute>
                </ProtectedRoute>
              } />
              
              {/* Catch-all redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </GameProvider>
      </AuthProvider>
    </Router>
  );
}

// Helper component to restrict access based on game phase
interface GamePhaseRouteProps {
  children: React.ReactNode;
  requiredPhase: string;
  fallbackPath: string;
}

const GamePhaseRoute: React.FC<GamePhaseRouteProps> = ({ children, requiredPhase, fallbackPath }) => {
  const { gamePhase, currentGame, isLoading, actions } = useGame();
  const [searchParams] = useSearchParams();
  const [loadingGame, setLoadingGame] = React.useState(false);

  const gameId = searchParams.get('gameId');

  // Simple access control - check if game phase or game status matches required phase
  const gamePhaseString = gamePhase.toString().toLowerCase();
  const currentGameStatus = currentGame?.status?.toLowerCase();
  const condition1 = gamePhaseString === requiredPhase.toLowerCase();
  const condition2 = currentGame && currentGameStatus === requiredPhase.toLowerCase();

  // Special case: Allow briefing phase access if coming from matchmaking (gameId in URL)
  // Games created by matchmaking start in 'briefing' status and should be accessible
  const condition3 = requiredPhase === 'briefing' && gameId && currentGame &&
    (currentGameStatus === 'briefing' || currentGameStatus === 'waiting');

  const hasAccess = condition1 || condition2 || condition3;

  console.log(`GamePhaseRoute [${requiredPhase}] access check:`, {
    gameId,
    gamePhase: gamePhase.toString(),
    currentGameStatus: currentGame?.status || 'null',
    condition1: `gamePhase=${gamePhaseString} === ${requiredPhase} = ${condition1}`,
    condition2: `gameStatus=${currentGameStatus} === ${requiredPhase} = ${condition2}`,
    condition3: `briefing+matchmaking=${requiredPhase === 'briefing'} && gameId=${!!gameId} && currentGame=${!!currentGame} && status=${currentGameStatus} = ${condition3}`,
    hasAccess,
    isLoading,
    loadingGame
  });

  // Load game if gameId is provided but no current game
  React.useEffect(() => {
    if (gameId && !currentGame && !isLoading && !loadingGame) {
      console.log(`GamePhaseRoute: Loading game ${gameId}`);
      setLoadingGame(true);

      actions.refreshGameState(gameId).then(() => {
        console.log('GamePhaseRoute: Game loaded successfully');
        setLoadingGame(false);
      }).catch((error) => {
        console.error('GamePhaseRoute: Failed to load game:', error);
        setLoadingGame(false);
      });
    }
  }, [gameId, currentGame, isLoading, loadingGame, actions]);

  // Show loading state while game context is loading OR if we have gameId but no currentGame
  const shouldShowLoading = isLoading || loadingGame || (gameId && !currentGame);

  if (shouldShowLoading) {
    console.log(`GamePhaseRoute: Showing loading state - isLoading: ${isLoading}, loadingGame: ${loadingGame}, gameId: ${!!gameId}, currentGame: ${!!currentGame}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-dark font-medium">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    console.warn(`GamePhaseRoute: Access denied for ${requiredPhase}, redirecting to ${fallbackPath}`);
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default App;
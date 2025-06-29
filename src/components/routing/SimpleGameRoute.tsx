// Simplified Game Route Guard
// Single-purpose route protection without complex state synchronization

import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { GameStatus } from '../../types/game';
// LoadingSpinner component inline since it doesn't exist
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-dark font-medium">Loading game...</p>
    </div>
  </div>
);

interface SimpleGameRouteProps {
  children: React.ReactNode;
  allowedStatuses: GameStatus[];
  fallbackPath?: string;
  requireGameId?: boolean;
}

export const SimpleGameRoute: React.FC<SimpleGameRouteProps> = ({
  children,
  allowedStatuses,
  fallbackPath = '/uiux/lobby',
  requireGameId = true
}) => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');

  // Always call hooks first
  const {
    game,
    isLoading,
    error,
    currentStatus
  } = useUnifiedGameState({
    gameId: gameId || undefined,
    autoNavigate: true // Enable auto-navigation for server-driven transitions
  });



  // Require gameId if specified (after hooks)
  if (requireGameId && !gameId) {
    console.log('SimpleGameRoute: No gameId provided, redirecting to lobby');
    return <Navigate to={fallbackPath} replace />;
  }

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show loading state while game is being loaded or retried, OR if we have a gameId but no game yet
  if (isLoading || (gameId && !game && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-medium-gray">Loading game...</p>
        </div>
      </div>
    );
  }

  // Handle errors (only after loading is complete)
  if (error) {
    console.error('SimpleGameRoute: Game loading error:', error);
    return <Navigate to={`${fallbackPath}?error=game_not_found`} replace />;
  }

  // Game not found (only after loading is complete AND we're not still loading)
  if (!game && !isLoading) {
    console.log('SimpleGameRoute: Game not found');
    return <Navigate to={`${fallbackPath}?error=game_not_found`} replace />;
  }

  // At this point, game should exist (TypeScript guard)
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-medium-gray">Loading game...</p>
        </div>
      </div>
    );
  }

  // Check if current status is allowed
  const isAllowed = currentStatus && allowedStatuses.includes(currentStatus);

  if (!isAllowed) {
    // Determine correct redirect based on current status
    const getRedirectPath = (status: GameStatus): string => {
      const params = `?gameId=${game.id}`;

      switch (status) {
        case 'waiting':
        case 'briefing':
          return `/uiux/pre-round${params}`;
        case 'drawing':
          return `/uiux/draw${params}`;
        case 'voting':
          return `/uiux/voting${params}`;
        case 'results':
          return `/uiux/results${params}`;
        case 'completed':
        case 'cancelled':
          return `/uiux/post-game${params}`;
        default:
          return fallbackPath;
      }
    };

    const redirectPath = getRedirectPath(currentStatus!);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Convenience components for specific phases
export const BriefingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimpleGameRoute allowedStatuses={['waiting', 'briefing']}>
    {children}
  </SimpleGameRoute>
);

export const DrawingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimpleGameRoute allowedStatuses={['drawing']}>
    {children}
  </SimpleGameRoute>
);

export const VotingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimpleGameRoute allowedStatuses={['voting']}>
    {children}
  </SimpleGameRoute>
);

export const ResultsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimpleGameRoute allowedStatuses={['results']}>
    {children}
  </SimpleGameRoute>
);

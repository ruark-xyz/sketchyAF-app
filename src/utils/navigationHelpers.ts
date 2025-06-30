import * as ROUTES from '../constants/routes';

/**
 * Returns the appropriate route for "Join a Game" buttons based on authentication status
 * @param isAuthenticated Whether the user is currently authenticated
 * @returns The route path to navigate to
 */
export const getJoinGameRoute = (isAuthenticated: boolean): string => {
  return isAuthenticated ? ROUTES.ROUTE_LOBBY : ROUTES.ROUTE_LOGIN;
};
/**
 * Application route constants
 * 
 * This file serves as a single source of truth for all route paths in the application.
 * Using these constants instead of hardcoded strings helps prevent typos and makes
 * route management more maintainable.
 */

// Public Routes
export const ROUTE_HOME = '/';
export const ROUTE_PREMIUM = '/premium';
export const ROUTE_LEADERBOARD = '/leaderboard';
export const ROUTE_ART = '/art';
export const ROUTE_ART_DETAIL = '/art/:drawingId';
export const ROUTE_PRIVACY = '/privacy';
export const ROUTE_TERMS = '/terms';
export const ROUTE_USER_PROFILE = '/user/:username';
export const ROUTE_BOOSTER_PACK_DETAIL = '/booster-packs/:packId';
export const ROUTE_ROADMAP = '/roadmap';
export const ROUTE_ROADMAP_DETAIL = '/roadmap/:itemId';

// Auth Routes
export const ROUTE_AUTH_CALLBACK = '/auth/callback';
export const ROUTE_RESET_PASSWORD = '/auth/reset-password';

// UI/UX Routes
export const ROUTE_LOGIN = '/uiux/login';
export const ROUTE_SIGNUP = '/uiux/signup';
export const ROUTE_FORGOT_PASSWORD = '/uiux/forgot-password';
export const ROUTE_LOBBY = '/uiux/lobby';
export const ROUTE_PRE_ROUND = '/uiux/pre-round';
export const ROUTE_DRAW = '/uiux/draw';
export const ROUTE_VOTING = '/uiux/voting';
export const ROUTE_POST_GAME = '/uiux/post-game';

// Protected Routes
export const ROUTE_PROFILE = '/profile';

// Helper functions
export const getArtDetailRoute = (drawingId: string | number) => `/art/${drawingId}`;
export const getUserProfileRoute = (username: string) => `/user/${username}`;
export const getBoosterPackDetailRoute = (packId: string) => `/booster-packs/${packId}`;
export const getRoadmapDetailRoute = (itemId: string) => `/roadmap/${itemId}`;

// Game routes with query parameters
export const getGameRoute = (route: string, gameId: string) => `${route}?gameId=${gameId}`;
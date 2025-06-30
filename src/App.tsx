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
import PostGameScreen from './pages/uiux/PostGameScreen';
import AuthCallback from './pages/auth/AuthCallback';
import ResetPassword from './pages/auth/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { BriefingRoute, DrawingRoute, VotingRoute, SimpleGameRoute } from './components/routing/SimpleGameRoute';
import Seo from './components/utils/Seo';
import ScrollToTop from './components/utils/ScrollToTop';
import * as ROUTES from './constants/routes';

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
              <Route path={ROUTES.ROUTE_HOME} element={<Home />} />
              <Route path={ROUTES.ROUTE_PREMIUM} element={<Premium />} />
              <Route path={ROUTES.ROUTE_LEADERBOARD} element={<Leaderboard />} />
              <Route path={ROUTES.ROUTE_ART} element={<ArtGallery />} />
              <Route path={ROUTES.ROUTE_ART_DETAIL} element={<ArtDetail />} />
              <Route path={ROUTES.ROUTE_PRIVACY} element={<Privacy />} />
              <Route path={ROUTES.ROUTE_TERMS} element={<Terms />} />
              <Route path={ROUTES.ROUTE_USER_PROFILE} element={<UserProfile />} />
              <Route path={ROUTES.ROUTE_BOOSTER_PACK_DETAIL} element={<BoosterPackDetail />} />
              <Route path={ROUTES.ROUTE_ROADMAP} element={<Roadmap />} />
              <Route path={ROUTES.ROUTE_ROADMAP_DETAIL} element={<RoadmapDetail />} />
              <Route path={ROUTES.ROUTE_AUTH_CALLBACK} element={<AuthCallback />} />
              <Route path={ROUTES.ROUTE_RESET_PASSWORD} element={<ResetPassword />} />

              {/* Protected Routes - Require Authentication */}
              <Route path={ROUTES.ROUTE_PROFILE} element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              


              {/* Game Flow Routes */}
              <Route path={ROUTES.ROUTE_LOGIN} element={
                <ProtectedRoute requireAuth={false} redirectTo={ROUTES.ROUTE_HOME}>
                  <Login />
                </ProtectedRoute>
              } />
              
              <Route path={ROUTES.ROUTE_SIGNUP} element={
                <ProtectedRoute requireAuth={false} redirectTo={ROUTES.ROUTE_HOME}>
                  <Signup />
                </ProtectedRoute>
              } />
              
              <Route path={ROUTES.ROUTE_FORGOT_PASSWORD} element={
                <ProtectedRoute requireAuth={false} redirectTo={ROUTES.ROUTE_HOME}>
                  <ForgotPassword />
                </ProtectedRoute>
              } />
              
              {/* Game Flow - Protected and Requires Game Context */}
              <Route path={ROUTES.ROUTE_LOBBY} element={
                <ProtectedRoute>
                  <LobbyScreen />
                </ProtectedRoute>
              } />
              
              <Route path={ROUTES.ROUTE_PRE_ROUND} element={
                <ProtectedRoute>
                  <BriefingRoute>
                    <PreRoundBriefingScreen />
                  </BriefingRoute>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.ROUTE_DRAW} element={
                <ProtectedRoute>
                  <DrawingRoute>
                    <ExcalidrawDraw />
                  </DrawingRoute>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.ROUTE_VOTING} element={
                <ProtectedRoute>
                  <VotingRoute>
                    <VotingScreen />
                  </VotingRoute>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.ROUTE_POST_GAME} element={
                <ProtectedRoute>
                  <SimpleGameRoute allowedStatuses={['completed', 'cancelled']} fallbackPath={ROUTES.ROUTE_LOBBY}>
                    <PostGameScreen />
                  </SimpleGameRoute>
                </ProtectedRoute>
              } />
              
              {/* Catch-all redirect to home */}
              <Route path="*" element={<Navigate to={ROUTES.ROUTE_HOME} replace />} />
            </Routes>
          </Layout>
        </GameProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
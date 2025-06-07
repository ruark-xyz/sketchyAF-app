import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/error/ErrorBoundary';
import NotificationManager from './components/ui/NotificationManager';
import GlobalLoadingOverlay from './components/ui/GlobalLoadingOverlay';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { AuthProvider } from './context/OptimizedAuthContext';
import { GlobalStateProvider } from './context/GlobalStateContext';
import { PerformanceProvider } from './context/PerformanceContext';
import Seo from './components/utils/Seo';
import ScrollToTop from './components/utils/ScrollToTop';

// Lazy load route components for better performance
const Home = React.lazy(() => import('./pages/Home'));
const ExcalidrawDraw = React.lazy(() => import('./pages/ExcalidrawDraw'));
const Premium = React.lazy(() => import('./pages/Premium'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const ArtGallery = React.lazy(() => import('./pages/ArtGallery'));
const ArtDetail = React.lazy(() => import('./pages/ArtDetail'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Signup = React.lazy(() => import('./pages/Auth/Signup'));
const ForgotPassword = React.lazy(() => import('./pages/Auth/ForgotPassword'));
const Profile = React.lazy(() => import('./pages/Profile'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const BoosterPackDetail = React.lazy(() => import('./pages/BoosterPackDetail'));
const Roadmap = React.lazy(() => import('./pages/Roadmap'));
const RoadmapDetail = React.lazy(() => import('./pages/RoadmapDetail'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-cream flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="font-heading font-semibold text-lg text-dark">
        Loading page...
      </p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        
        <Seo 
          title="SketchyAF - The Wildly Entertaining Drawing Game"
          description="SketchyAF is a weird, wildly entertaining drawing game perfect for killing time anywhere. Join 60-second rounds of frantic drawing and fun!"
        />
        
        <PerformanceProvider>
          <GlobalStateProvider>
            <AuthProvider>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/excalidraw" element={<ExcalidrawDraw />} />
                    <Route path="/premium" element={<Premium />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/art" element={<ArtGallery />} />
                    <Route path="/art/:drawingId" element={<ArtDetail />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/user/:username" element={<UserProfile />} />
                    <Route path="/booster-packs/:packId" element={<BoosterPackDetail />} />
                    <Route path="/roadmap" element={<Roadmap />} />
                    <Route path="/roadmap/:itemId" element={<RoadmapDetail />} />
                  </Routes>
                </Suspense>
              </Layout>
              
              <NotificationManager />
              <GlobalLoadingOverlay />
            </AuthProvider>
          </GlobalStateProvider>
        </PerformanceProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
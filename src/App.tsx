import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import ExcalidrawDraw from './pages/ExcalidrawDraw';
import Premium from './pages/Premium';
import Leaderboard from './pages/Leaderboard';
import ArtGallery from './pages/ArtGallery';
import ArtDetail from './pages/ArtDetail';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import BoosterPackDetail from './pages/BoosterPackDetail';
import Roadmap from './pages/Roadmap';
import RoadmapDetail from './pages/RoadmapDetail';
import { AuthProvider } from './context/OptimizedAuthContext';
import { GlobalStateProvider } from './context/GlobalStateContext';
import ErrorBoundary from './components/error/ErrorBoundary';
import NotificationManager from './components/ui/NotificationManager';
import GlobalLoadingOverlay from './components/ui/GlobalLoadingOverlay';
import Seo from './components/utils/Seo';
import ScrollToTop from './components/utils/ScrollToTop';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        
        <Seo 
          title="SketchyAF - The Wildly Entertaining Drawing Game"
          description="SketchyAF is a weird, wildly entertaining drawing game perfect for killing time anywhere. Join 60-second rounds of frantic drawing and fun!"
        />
        
        <GlobalStateProvider>
          <AuthProvider>
            <Layout>
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
            </Layout>
            
            <NotificationManager />
            <GlobalLoadingOverlay />
          </AuthProvider>
        </GlobalStateProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;</parameter>
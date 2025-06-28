import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Palette, 
  Eraser, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Package, 
  Send, 
  X, 
  Users,
  AlertTriangle,
  Check,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import { useUnifiedGameState } from '../../hooks/useUnifiedGameState';
import { useSimpleTimer } from '../../hooks/useSimpleTimer';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';

// Mock data for demo purposes
const BOOSTER_STENCILS = [
  { id: 'meme1', name: 'Drake Meme', icon: '🤷‍♂️', pack: 'Meme Lords' },
  { id: 'meme2', name: 'Cat Reaction', icon: '😸', pack: 'Meme Lords' },
  { id: 'classic1', name: 'Trollface', icon: '😈', pack: 'Internet Classics' },
  { id: 'classic2', name: 'Nyan Cat', icon: '🌈', pack: 'Internet Classics' },
  { id: 'emoji1', name: 'Heart Eyes', icon: '😍', pack: 'Emoji Explosion' },
  { id: 'emoji2', name: 'Fire', icon: '🔥', pack: 'Emoji Explosion' },
];

const DRAWING_COLORS = [
  '#000000', // Black
  '#FF5A5A', // Red
  '#7BC043', // Green  
  '#22A7E5', // Blue
  '#FFCC00', // Yellow
  '#FF66C4', // Pink
  '#8A4FFF', // Purple
  '#FF7846', // Orange
  '#40E0D0', // Turquoise
  '#8B4513', // Brown
  '#708090', // Gray
  '#FFFFFF', // White
];

const DrawingCanvasScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    game: currentGame,
    isLoading,
    error
  } = useUnifiedGameState({ autoNavigate: true }); // Enable auto-navigation for server-driven transitions

  // For now, we'll need to keep some GameContext usage for drawing-specific state
  // TODO: Move drawing state to a separate hook or context
  const {
    participants,
    submissions,
    hasSubmitted,
    selectedBoosterPack,
    actions,
    drawingContext
  } = useGame();
  
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [showBoosterPacks, setShowBoosterPacks] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Simple timer display (no auto-submit logic)
  const {
    timeRemaining,
    formattedTime,
    isExpired,
    redirectMessage,
    isLoading: timerLoading,
    error: timerError
  } = useSimpleTimer({
    gameId: currentGame?.id || ''
  });

  // Initialize from game context
  useEffect(() => {
    if (hasSubmitted) {
      setIsSubmitted(true);
    }
  }, [hasSubmitted]);

  // Navigation is now handled by useUnifiedGameState in SimpleGameRoute

  // Auto-submit logic is now handled server-side via timer expiration

  // Simulate drawing activity (for demo)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasDrawn(true);
      setCanUndo(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const handleCanvasClick = () => {
    if (!hasDrawn) {
      setHasDrawn(true);
      setCanUndo(true);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!hasDrawn || isSubmitted || isLoading) return;
    
    setSubmissionError(null);
    
    try {
      // In a real implementation, this would get the actual drawing data
      const mockDrawingData = {
        elements: [{ type: 'freedraw', points: [[100, 100], [200, 200]] }],
        appState: { viewBackgroundColor: '#ffffff' }
      };
      
      // Create a mock drawing URL (in real app, this would be generated from canvas)
      const mockDrawingUrl = 'https://images.pexels.com/photos/1266302/pexels-photo-1266302.jpeg?auto=compress&cs=tinysrgb&w=600';
      
      // Submit drawing
      await actions.submitDrawing(mockDrawingData, mockDrawingUrl);
      
      setIsSubmitted(true);
      setShowSuccessMessage(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      // Phase transitions are now handled server-side automatically
    } catch (err) {
      console.error('Failed to submit drawing:', err);
      setSubmissionError(err instanceof Error ? err.message : 'Failed to submit drawing');
    }
  }, [hasDrawn, isSubmitted, isLoading, actions, submissions.length, participants.length, currentGame, navigate]);

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    // In real app, this would navigate back to lobby
    navigate('/uiux/lobby');
  };

  const handleUndo = () => {
    setCanRedo(true);
    if (canUndo) {
      console.log('Undo action');
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      console.log('Redo action');
      setCanRedo(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(50, prev - 25));
  };

  // Count submitted players
  const submittedPlayersCount = submissions.length;

  return (
    <>
      <Seo 
        title="Drawing Time! | SketchyAF"
        description="Create your masterpiece! Draw fast, vote faster."
      />
      
      <div className="min-h-screen bg-dark flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b-2 border-dark p-3 flex items-center justify-between relative z-20">
          {/* Timer */}
          <motion.div
            key={timeRemaining}
            initial={{ scale: timeRemaining <= 10 ? 1.1 : 1 }}
            animate={{ scale: 1 }}
            className={`flex items-center px-3 py-2 rounded-full border-2 border-dark ${
              isWarning
                ? warningLevel === 'high'
                  ? 'bg-red text-white animate-pulse'
                  : warningLevel === 'medium'
                  ? 'bg-orange text-dark'
                  : 'bg-yellow-100 text-dark'
                : 'bg-green text-dark'
            }`}
          >
            <Clock size={18} className="mr-2" />
            <span className="font-heading font-bold text-lg">
              {isExpired ? redirectMessage : formattedTime}
            </span>
          </motion.div>

          {/* Prompt */}
          <div className="flex-1 text-center px-4">
            <p className="font-heading font-bold text-lg text-dark truncate">
              "{currentGame?.prompt || 'Loading prompt...'}"
            </p>
          </div>

          {/* Exit Button */}
          <Button 
            variant="tertiary" 
            size="sm" 
            onClick={handleExit}
            className="text-medium-gray"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Main Drawing Area */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Drawing Tools */}
          <div className="w-16 bg-white border-r-2 border-dark flex flex-col items-center py-4 space-y-3 relative z-10">
            {/* Tool Selection */}
            <button
              onClick={() => setSelectedTool('pen')}
              className={`w-12 h-12 rounded-lg border-2 border-dark flex items-center justify-center transition-all ${
                selectedTool === 'pen' 
                  ? 'bg-primary text-white' 
                  : 'bg-off-white hover:bg-primary/10'
              }`}
            >
              <Palette size={20} />
            </button>

            <button
              onClick={() => setSelectedTool('eraser')}
              className={`w-12 h-12 rounded-lg border-2 border-dark flex items-center justify-center transition-all ${
                selectedTool === 'eraser' 
                  ? 'bg-primary text-white' 
                  : 'bg-off-white hover:bg-primary/10'
              }`}
            >
              <Eraser size={20} />
            </button>

            {/* Brush Size */}
            <div className="w-12 text-center">
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full transform -rotate-90 origin-center"
                style={{ width: '48px', marginTop: '20px', marginBottom: '20px' }}
              />
            </div>

            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`w-12 h-12 rounded-lg border-2 border-dark flex items-center justify-center transition-all ${
                canUndo 
                  ? 'bg-off-white hover:bg-secondary/10' 
                  : 'bg-light-gray/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <Undo2 size={20} />
            </button>

            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`w-12 h-12 rounded-lg border-2 border-dark flex items-center justify-center transition-all ${
                canRedo 
                  ? 'bg-off-white hover:bg-secondary/10' 
                  : 'bg-light-gray/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <Redo2 size={20} />
            </button>

            {/* Zoom Controls */}
            <div className="border-t border-light-gray pt-3 space-y-2">
              <button
                onClick={handleZoomIn}
                className="w-12 h-12 rounded-lg border-2 border-dark bg-off-white hover:bg-secondary/10 flex items-center justify-center"
              >
                <ZoomIn size={20} />
              </button>

              <div className="text-xs text-center font-heading font-bold">
                {zoomLevel}%
              </div>

              <button
                onClick={handleZoomOut}
                className="w-12 h-12 rounded-lg border-2 border-dark bg-off-white hover:bg-secondary/10 flex items-center justify-center"
              >
                <ZoomOut size={20} />
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative bg-white">
            {/* Canvas Placeholder */}
            <div 
              className="w-full h-full border border-light-gray cursor-crosshair relative overflow-hidden"
              onClick={handleCanvasClick}
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {/* Grid Background */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v1H0zM0 0v20h1V0z' fill='%23000' fill-opacity='0.1'/%3E%3C/svg%3E")`
                }}
              />
              
              {/* Canvas Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {hasDrawn ? (
                  <div className="text-8xl opacity-20">🎨</div>
                ) : (
                  <div className="text-center text-medium-gray">
                    <div className="text-6xl mb-4">✏️</div>
                    <p className="font-heading font-bold text-xl">
                      Start drawing here!
                    </p>
                    <p className="text-sm">
                      Tap anywhere to begin your masterpiece
                    </p>
                  </div>
                )}
              </div>

              {/* Drawing Cursor Indicator */}
              {selectedTool === 'pen' && (
                <div 
                  className="absolute pointer-events-none rounded-full border-2"
                  style={{
                    width: `${brushSize * 4}px`,
                    height: `${brushSize * 4}px`,
                    backgroundColor: selectedColor,
                    borderColor: selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF',
                    opacity: 0.7,
                  }}
                />
              )}
            </div>

            {/* Submit Button */}
            {!isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: hasDrawn ? 1 : 0.5, y: 0 }}
                className="absolute bottom-4 right-4"
              >
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={!hasDrawn || isLoading}
                  className="shadow-lg"
                >
                  <Send size={20} className="mr-2" />
                  {isLoading ? 'Submitting...' : 'Submit Drawing'}
                </Button>
              </motion.div>
            )}

            {/* Submitted Overlay */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="bg-white rounded-lg border-2 border-dark p-6 text-center hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
                  <Check size={48} className="text-green mx-auto mb-4" />
                  <h3 className="font-heading font-bold text-2xl text-dark mb-2">
                    Drawing Submitted!
                  </h3>
                  <p className="text-medium-gray">
                    Waiting for other players to finish...
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Sidebar - Colors & Booster Packs */}
          <div className="w-16 bg-white border-l-2 border-dark flex flex-col relative z-10">
            {/* Color Palette */}
            <div className="p-2 border-b border-light-gray">
              <div className="grid grid-cols-2 gap-1">
                {DRAWING_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-dark shadow-md scale-110' 
                        : 'border-light-gray'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Booster Packs Toggle - Only show if a booster pack is selected */}
            {selectedBoosterPack && (
              <div className="p-2">
                <button
                  onClick={() => setShowBoosterPacks(!showBoosterPacks)}
                  className={`w-12 h-12 rounded-lg border-2 border-dark flex items-center justify-center transition-all ${
                    showBoosterPacks
                      ? 'bg-purple text-white'
                      : 'bg-off-white hover:bg-purple/10'
                  }`}
                >
                  <Package size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Player Status Bar */}
        <div className="bg-white border-t-2 border-dark p-3 relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users size={18} className="text-medium-gray" />
              <span className="font-heading font-semibold text-sm">
                Players: {submittedPlayersCount}/{participants.length} submitted
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {participants.map(participant => (
                <div key={participant.id} className="flex items-center">
                  <div className="relative">
                    <img 
                      src={participant.avatar_url || `https://ui-avatars.com/api/?name=${participant.username}&background=random`} 
                      alt={participant.username}
                      className={`w-8 h-8 rounded-full border-2 ${
                        submissions.some(s => s.user_id === participant.user_id)
                          ? 'border-green' 
                          : 'border-orange'
                      }`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${
                      submissions.some(s => s.user_id === participant.user_id) ? 'bg-green' : 'bg-orange'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booster Pack Stencils Panel */}
        <AnimatePresence>
          {showBoosterPacks && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed right-0 top-0 bottom-0 w-64 bg-white border-l-2 border-dark shadow-lg z-30 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg">Stencils</h3>
                  <button
                    onClick={() => setShowBoosterPacks(false)}
                    className="text-medium-gray hover:text-dark"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {BOOSTER_STENCILS.map(stencil => (
                    <motion.button
                      key={stencil.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full p-3 bg-off-white border-2 border-light-gray rounded-lg text-left hover:border-purple transition-all"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{stencil.icon}</span>
                        <div>
                          <p className="font-heading font-semibold text-sm">
                            {stencil.name}
                          </p>
                          <p className="text-xs text-medium-gray">
                            {stencil.pack}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-6 p-3 bg-purple/10 rounded-lg border border-purple/30">
                  <p className="text-xs text-center text-purple">
                    💡 Drag stencils onto canvas to use them in your drawing
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="bg-white rounded-lg border-2 border-dark p-6 max-w-sm w-full hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              >
                <div className="text-center">
                  <AlertTriangle size={48} className="text-red mx-auto mb-4" />
                  <h2 className="font-heading font-bold text-xl text-dark mb-2">
                    Exit Game?
                  </h2>
                  <p className="text-medium-gray mb-6">
                    You'll lose your drawing progress and miss out on the voting round!
                  </p>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setShowExitConfirm(false)}
                      className="flex-1"
                    >
                      Keep Drawing
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={confirmExit}
                      className="flex-1 bg-red hover:bg-red/90"
                    >
                      Exit Game
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Notification Area */}
        {(submissionError || showSuccessMessage) && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 max-w-md">
            {submissionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">Submission Failed</h4>
                    <p className="text-sm text-red-700 mt-1">{submissionError}</p>
                    <div className="mt-3">
                      <button
                        onClick={() => setSubmissionError(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showSuccessMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <Check size={20} className="text-green-500" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Success!</h4>
                    <p className="text-sm text-green-700">Your drawing has been submitted successfully.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DrawingCanvasScreen;
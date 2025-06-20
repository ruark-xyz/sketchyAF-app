// Enhanced Drawing Screen with Real-time Integration
// Demonstrates real-time timer sync, submission tracking, and player presence

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Palette, 
  Square, 
  Circle, 
  Minus,
  Send,
  Users,
  Clock,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { useAuth } from '../../context/AuthContext';
import GameEventHandler from './GameEventHandler';
import GameTimer from './GameTimer';
import GamePresenceIndicator from './GamePresenceIndicator';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import { 
  DrawingSubmittedEvent,
  TimerSyncEvent 
} from '../../types/realtime';
import { SubmissionService } from '../../services/SubmissionService';
import { GameService } from '../../services/GameService';

interface RealtimeDrawingScreenProps {
  gameId: string;
  prompt: string;
  duration?: number; // Drawing duration in seconds
  onSubmissionComplete?: (submissionId: string) => void;
  onTimeUp?: () => void;
  onExit?: () => void;
  onError?: (error: string) => void;
}

const RealtimeDrawingScreen: React.FC<RealtimeDrawingScreenProps> = ({
  gameId,
  prompt,
  duration = 180, // 3 minutes default
  onSubmissionComplete,
  onTimeUp,
  onExit,
  onError
}) => {
  const { currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'rectangle' | 'circle' | 'line'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Real-time state
  const [submittedPlayers, setSubmittedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const {
    isConnected,
    connectionStatus,
    gamePresence,
    broadcastTimerSync,
    error: realtimeError
  } = useRealtimeGame({ gameId });

  // Drawing functions (simplified for demo)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSubmitted) return;
    setIsDrawing(true);
    setHasDrawn(true);
    setCanUndo(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSubmitted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!hasDrawn || isSubmitted || !currentUser) {
      if (!hasDrawn) {
        onError?.('Draw something first!');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Create submission
      const result = await SubmissionService.submitDrawing({
        game_id: gameId,
        drawing_data: blob,
        element_count: 10, // Mock count
        drawing_time_seconds: duration - Math.floor(Math.random() * 60) // Mock time
      });

      if (result.success && result.data) {
        setIsSubmitted(true);
        onSubmissionComplete?.(result.data.id);
      } else {
        onError?.(result.error || 'Failed to submit drawing');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to submit drawing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle drawing submitted events from other players
  const handleDrawingSubmitted = (event: DrawingSubmittedEvent) => {
    setSubmittedPlayers(prev => {
      if (!prev.includes(event.data.username)) {
        return [...prev, event.data.username];
      }
      return prev;
    });
  };

  // Handle timer sync events
  const handleTimerSync = (event: TimerSyncEvent) => {
    // Timer component handles this automatically
    console.log('Timer synced:', event.data.timeRemaining);
  };

  // Handle time up
  const handleTimeUp = () => {
    if (!isSubmitted && hasDrawn) {
      // Auto-submit if player has drawn something
      handleSubmit();
    }
    onTimeUp?.();
  };

  // Handle exit
  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    onExit?.();
  };

  // Tool handlers
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

  // Handle errors
  useEffect(() => {
    if (realtimeError) {
      onError?.(realtimeError);
    }
  }, [realtimeError, onError]);

  return (
    <>
      <GameEventHandler
        gameId={gameId}
        onDrawingSubmitted={handleDrawingSubmitted}
        onTimerSync={handleTimerSync}
        onError={onError}
      />

      <div className="min-h-screen bg-gradient-to-br from-cream via-turquoise/20 to-pink/20 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b-2 border-dark p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ConnectionStatusIndicator 
                status={connectionStatus} 
                size="sm" 
              />
              
              <GamePresenceIndicator 
                gameId={gameId}
                showUsernames={false}
                maxVisible={4}
              />
              
              <div className="text-sm text-gray-600">
                {submittedPlayers.length > 0 && (
                  <span>{submittedPlayers.length} submitted</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <GameTimer
                gameId={gameId}
                phase="drawing"
                duration={duration}
                onTimeUp={handleTimeUp}
                size="md"
              />
              
              <Button 
                variant="tertiary" 
                size="sm" 
                onClick={handleExit}
                className="text-medium-gray"
              >
                <X size={18} className="mr-1" />
                Exit
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Toolbar */}
          <div className="w-16 bg-white border-r-2 border-dark p-2 space-y-2">
            {/* Tools */}
            <div className="space-y-1">
              {[
                { tool: 'pen' as const, icon: Palette },
                { tool: 'rectangle' as const, icon: Square },
                { tool: 'circle' as const, icon: Circle },
                { tool: 'line' as const, icon: Minus }
              ].map(({ tool, icon: Icon }) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool)}
                  className={`w-12 h-12 rounded border-2 border-dark flex items-center justify-center transition-colors ${
                    selectedTool === tool 
                      ? 'bg-turquoise text-white' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>

            {/* Color picker */}
            <div className="pt-2 border-t border-gray-200">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-12 h-12 rounded border-2 border-dark cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200 space-y-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="w-12 h-12 rounded border-2 border-dark flex items-center justify-center bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Undo2 size={16} />
              </button>
              
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="w-12 h-12 rounded border-2 border-dark flex items-center justify-center bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Redo2 size={16} />
              </button>
              
              <button
                onClick={handleZoomIn}
                className="w-12 h-12 rounded border-2 border-dark flex items-center justify-center bg-white hover:bg-gray-50"
              >
                <ZoomIn size={16} />
              </button>
              
              <button
                onClick={handleZoomOut}
                className="w-12 h-12 rounded border-2 border-dark flex items-center justify-center bg-white hover:bg-gray-50"
              >
                <ZoomOut size={16} />
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Prompt */}
            <div className="bg-white border-b-2 border-dark p-4">
              <div className="text-center">
                <h2 className="font-heading font-bold text-xl text-dark mb-1">
                  Draw: "{prompt}"
                </h2>
                <p className="text-sm text-gray-600">
                  Make it sketchy, make it yours!
                </p>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="border-2 border-dark rounded bg-white cursor-crosshair"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                
                {isSubmitted && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <div className="bg-white p-4 rounded border-2 border-dark">
                      <p className="font-medium text-dark">Drawing Submitted!</p>
                      <p className="text-sm text-gray-600">Waiting for other players...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-4 bg-white border-t-2 border-dark">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={!hasDrawn || isSubmitted || isSubmitting}
                className="w-full"
              >
                <Send size={20} className="mr-2" />
                {isSubmitting ? 'Submitting...' : isSubmitted ? 'Submitted!' : 'Submit Drawing'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg border-2 border-dark p-6 max-w-sm mx-4"
          >
            <h3 className="font-heading font-bold text-lg text-dark mb-2">
              Exit Game?
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to leave? Your progress will be lost.
            </p>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmExit}
                className="flex-1"
              >
                Exit
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default RealtimeDrawingScreen;

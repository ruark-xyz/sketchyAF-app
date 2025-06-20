// Game Presence Indicator Component
// Shows who's currently present in the game

import React, { useState, useEffect } from 'react';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { PresenceEvent } from '../../types/realtime';

interface GamePresenceIndicatorProps {
  gameId?: string;
  showUsernames?: boolean;
  maxVisible?: number;
  className?: string;
}

interface PresenceUser {
  userId: string;
  username?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

const GamePresenceIndicator: React.FC<GamePresenceIndicatorProps> = ({
  gameId,
  showUsernames = false,
  maxVisible = 5,
  className = ''
}) => {
  const { gamePresence, addPresenceListener, removePresenceListener, isConnected } = useRealtimeGame({ gameId });
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // Handle presence events
  useEffect(() => {
    const handlePresenceChange = (presence: PresenceEvent) => {
      setPresenceUsers(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(user => user.userId === presence.uuid);

        switch (presence.action) {
          case 'join':
            if (existingIndex === -1) {
              updated.push({
                userId: presence.uuid,
                isOnline: true,
                lastSeen: new Date()
              });
            } else {
              updated[existingIndex].isOnline = true;
              updated[existingIndex].lastSeen = new Date();
            }
            break;

          case 'leave':
          case 'timeout':
            if (existingIndex !== -1) {
              updated[existingIndex].isOnline = false;
              updated[existingIndex].lastSeen = new Date();
            }
            break;

          case 'state-change':
            if (existingIndex !== -1) {
              updated[existingIndex].lastSeen = new Date();
              // Could update username from state if available
              if (presence.state?.username) {
                updated[existingIndex].username = presence.state.username;
              }
            }
            break;
        }

        return updated;
      });
    };

    addPresenceListener(handlePresenceChange);

    return () => {
      removePresenceListener(handlePresenceChange);
    };
  }, [addPresenceListener, removePresenceListener]);

  // Update presence users from gamePresence prop
  useEffect(() => {
    if (gamePresence.length > 0) {
      setPresenceUsers(prev => {
        const updated = [...prev];
        
        // Mark all as offline first
        updated.forEach(user => {
          user.isOnline = false;
        });

        // Mark present users as online
        gamePresence.forEach(userId => {
          const existingIndex = updated.findIndex(user => user.userId === userId);
          if (existingIndex !== -1) {
            updated[existingIndex].isOnline = true;
            updated[existingIndex].lastSeen = new Date();
          } else {
            updated.push({
              userId,
              isOnline: true,
              lastSeen: new Date()
            });
          }
        });

        return updated;
      });
    }
  }, [gamePresence]);

  const onlineUsers = presenceUsers.filter(user => user.isOnline);
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, onlineUsers.length - maxVisible);

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-xs text-gray-500">Offline</span>
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
        <span className="text-xs text-gray-600">No players online</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {/* Online indicator */}
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        
        {/* User count */}
        <span className="text-xs font-medium text-gray-700">
          {onlineUsers.length} online
        </span>
      </div>

      {showUsernames && (
        <div className="flex items-center space-x-1">
          {visibleUsers.map((user, index) => (
            <div
              key={user.userId}
              className="flex items-center space-x-1"
            >
              {index > 0 && <span className="text-xs text-gray-400">,</span>}
              <span className="text-xs text-gray-600">
                {user.username || `User ${user.userId.slice(0, 6)}`}
              </span>
            </div>
          ))}
          
          {hiddenCount > 0 && (
            <span className="text-xs text-gray-500">
              +{hiddenCount} more
            </span>
          )}
        </div>
      )}

      {/* Avatar stack for visual representation */}
      {!showUsernames && visibleUsers.length > 0 && (
        <div className="flex -space-x-1">
          {visibleUsers.map((user, index) => (
            <div
              key={user.userId}
              className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center"
              style={{ zIndex: visibleUsers.length - index }}
              title={user.username || user.userId}
            >
              <span className="text-xs text-white font-medium">
                {user.username ? user.username[0].toUpperCase() : user.userId[0].toUpperCase()}
              </span>
            </div>
          ))}
          
          {hiddenCount > 0 && (
            <div
              className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center"
              style={{ zIndex: 0 }}
              title={`${hiddenCount} more players`}
            >
              <span className="text-xs text-white font-medium">
                +{hiddenCount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePresenceIndicator;

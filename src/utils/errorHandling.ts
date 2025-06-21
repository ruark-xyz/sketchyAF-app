// Error Handling Utilities
// Comprehensive error handling, recovery mechanisms, and user-friendly error messages

import { GamePhase, PlayerStatus } from '../types/gameContext';

// Error Types
export type GameErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'GAME_STATE_ERROR'
  | 'REALTIME_ERROR'
  | 'DATABASE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GameError {
  type: GameErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
  retryable: boolean;
  context?: {
    gamePhase?: GamePhase;
    playerStatus?: PlayerStatus;
    action?: string;
  };
}

// Error Recovery Strategy
export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'reset' | 'ignore' | 'escalate';
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => Promise<void>;
  resetAction?: () => void;
}

// Error Handler Class
export class GameErrorHandler {
  private errorHistory: GameError[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private errorCallbacks: Map<GameErrorType, ((error: GameError) => void)[]> = new Map();

  /**
   * Handle an error with appropriate strategy
   */
  async handleError(
    error: any,
    context?: {
      gamePhase?: GamePhase;
      playerStatus?: PlayerStatus;
      action?: string;
    }
  ): Promise<GameError> {
    const gameError = this.createGameError(error, context);
    this.errorHistory.push(gameError);
    
    console.error('Game error occurred:', gameError);
    
    // Execute error callbacks
    this.executeErrorCallbacks(gameError);
    
    // Apply recovery strategy if error is recoverable
    if (gameError.recoverable) {
      await this.applyRecoveryStrategy(gameError);
    }
    
    return gameError;
  }

  /**
   * Create a structured game error from any error
   */
  private createGameError(error: any, context?: any): GameError {
    let gameError: GameError;

    if (error instanceof Error) {
      gameError = this.categorizeError(error, context);
    } else if (typeof error === 'string') {
      gameError = {
        type: 'UNKNOWN_ERROR',
        severity: 'medium',
        message: error,
        userMessage: 'An unexpected error occurred',
        timestamp: Date.now(),
        recoverable: false,
        retryable: false,
        context
      };
    } else {
      gameError = {
        type: 'UNKNOWN_ERROR',
        severity: 'medium',
        message: 'Unknown error occurred',
        userMessage: 'An unexpected error occurred',
        timestamp: Date.now(),
        recoverable: false,
        retryable: false,
        context
      };
    }

    return gameError;
  }

  /**
   * Categorize error based on message and context
   */
  private categorizeError(error: Error, context?: any): GameError {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'NETWORK_ERROR',
        severity: 'high',
        message: error.message,
        userMessage: 'Connection problem. Please check your internet connection.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context
      };
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('login')) {
      return {
        type: 'AUTHENTICATION_ERROR',
        severity: 'high',
        message: error.message,
        userMessage: 'Authentication required. Please log in again.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: false,
        context
      };
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        type: 'VALIDATION_ERROR',
        severity: 'medium',
        message: error.message,
        userMessage: 'Please check your input and try again.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: false,
        context
      };
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access')) {
      return {
        type: 'PERMISSION_ERROR',
        severity: 'medium',
        message: error.message,
        userMessage: 'You don\'t have permission to perform this action.',
        timestamp: Date.now(),
        recoverable: false,
        retryable: false,
        context
      };
    }
    
    // Game state errors
    if (message.includes('game') || message.includes('phase') || message.includes('state')) {
      return {
        type: 'GAME_STATE_ERROR',
        severity: 'medium',
        message: error.message,
        userMessage: 'Game state error. Please refresh and try again.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context
      };
    }
    
    // Realtime errors
    if (message.includes('realtime') || message.includes('pubnub') || message.includes('websocket')) {
      return {
        type: 'REALTIME_ERROR',
        severity: 'high',
        message: error.message,
        userMessage: 'Real-time connection issue. Trying to reconnect...',
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context
      };
    }
    
    // Database errors
    if (message.includes('database') || message.includes('supabase') || message.includes('sql')) {
      return {
        type: 'DATABASE_ERROR',
        severity: 'high',
        message: error.message,
        userMessage: 'Database error. Please try again later.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context
      };
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'TIMEOUT_ERROR',
        severity: 'medium',
        message: error.message,
        userMessage: 'Request timed out. Please try again.',
        timestamp: Date.now(),
        recoverable: true,
        retryable: true,
        context
      };
    }
    
    // Default unknown error
    return {
      type: 'UNKNOWN_ERROR',
      severity: 'medium',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      timestamp: Date.now(),
      recoverable: true,
      retryable: true,
      context
    };
  }

  /**
   * Apply recovery strategy for an error
   */
  private async applyRecoveryStrategy(error: GameError): Promise<void> {
    const strategy = this.getRecoveryStrategy(error);
    
    switch (strategy.type) {
      case 'retry':
        await this.handleRetry(error, strategy);
        break;
      case 'fallback':
        if (strategy.fallbackAction) {
          await strategy.fallbackAction();
        }
        break;
      case 'reset':
        if (strategy.resetAction) {
          strategy.resetAction();
        }
        break;
      case 'ignore':
        console.log('Ignoring error:', error.message);
        break;
      case 'escalate':
        console.error('Escalating error:', error);
        break;
    }
  }

  /**
   * Get recovery strategy for error type
   */
  private getRecoveryStrategy(error: GameError): ErrorRecoveryStrategy {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return { type: 'retry', maxRetries: 3, retryDelay: 2000 };
      case 'REALTIME_ERROR':
        return { type: 'retry', maxRetries: 5, retryDelay: 1000 };
      case 'DATABASE_ERROR':
        return { type: 'retry', maxRetries: 2, retryDelay: 3000 };
      case 'TIMEOUT_ERROR':
        return { type: 'retry', maxRetries: 2, retryDelay: 1000 };
      case 'AUTHENTICATION_ERROR':
        return { type: 'escalate' };
      case 'PERMISSION_ERROR':
        return { type: 'escalate' };
      case 'VALIDATION_ERROR':
        return { type: 'ignore' };
      case 'GAME_STATE_ERROR':
        return { type: 'fallback' };
      default:
        return { type: 'ignore' };
    }
  }

  /**
   * Handle retry logic
   */
  private async handleRetry(error: GameError, strategy: ErrorRecoveryStrategy): Promise<void> {
    const errorKey = `${error.type}_${error.context?.action || 'unknown'}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;
    
    if (currentAttempts >= (strategy.maxRetries || 3)) {
      console.log(`Max retries reached for ${errorKey}`);
      return;
    }
    
    this.retryAttempts.set(errorKey, currentAttempts + 1);
    
    if (strategy.retryDelay) {
      await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
    }
    
    console.log(`Retrying ${errorKey}, attempt ${currentAttempts + 1}`);
  }

  /**
   * Register error callback
   */
  onError(errorType: GameErrorType, callback: (error: GameError) => void): void {
    if (!this.errorCallbacks.has(errorType)) {
      this.errorCallbacks.set(errorType, []);
    }
    this.errorCallbacks.get(errorType)!.push(callback);
  }

  /**
   * Execute error callbacks
   */
  private executeErrorCallbacks(error: GameError): void {
    const callbacks = this.errorCallbacks.get(error.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Get error history
   */
  getErrorHistory(): GameError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<GameErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: GameError[];
  } {
    const errorsByType: Record<GameErrorType, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    
    this.errorHistory.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });
    
    const recentErrors = this.errorHistory
      .filter(error => Date.now() - error.timestamp < 300000) // Last 5 minutes
      .slice(-10); // Last 10 errors
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recentErrors
    };
  }
}

// Utility functions
export const createGameErrorHandler = (): GameErrorHandler => {
  return new GameErrorHandler();
};

export const isRetryableError = (error: GameError): boolean => {
  return error.retryable && error.recoverable;
};

export const getErrorDisplayMessage = (error: GameError): string => {
  return error.userMessage || error.message || 'An error occurred';
};

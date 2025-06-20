// Real-time Error Handling Utilities
// Provides error handling, retry logic, and graceful degradation for real-time features

import { RealtimeErrorCode, REALTIME_CONSTANTS } from '../types/realtime';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface ErrorHandlerOptions {
  onError?: (error: RealtimeError) => void;
  onRetry?: (attempt: number, error: RealtimeError) => void;
  onMaxRetriesReached?: (error: RealtimeError) => void;
}

export class RealtimeError extends Error {
  constructor(
    message: string,
    public code: RealtimeErrorCode,
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'RealtimeError';
  }
}

export class RealtimeErrorHandler {
  private static instance: RealtimeErrorHandler | null = null;
  private errorQueue: RealtimeError[] = [];
  private retryQueue: Map<string, RetryOperation> = new Map();

  static getInstance(): RealtimeErrorHandler {
    if (!RealtimeErrorHandler.instance) {
      RealtimeErrorHandler.instance = new RealtimeErrorHandler();
    }
    return RealtimeErrorHandler.instance;
  }

  /**
   * Handle an error with optional retry logic
   */
  async handleError(
    error: Error | RealtimeError,
    operation: () => Promise<any>,
    options: RetryOptions & ErrorHandlerOptions = {}
  ): Promise<any> {
    const realtimeError = this.normalizeError(error);
    
    // Log error
    console.error('Real-time error:', realtimeError);
    
    // Add to error queue for monitoring
    this.errorQueue.push(realtimeError);
    this.trimErrorQueue();

    // Call error callback
    options.onError?.(realtimeError);

    // Check if error is retryable
    if (!realtimeError.retryable) {
      throw realtimeError;
    }

    // Attempt retry with exponential backoff
    return this.retryWithBackoff(operation, realtimeError, options);
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryWithBackoff(
    operation: () => Promise<any>,
    originalError: RealtimeError,
    options: RetryOptions & ErrorHandlerOptions = {}
  ): Promise<any> {
    const {
      maxAttempts = REALTIME_CONSTANTS.MAX_RETRY_ATTEMPTS,
      baseDelay = REALTIME_CONSTANTS.RETRY_BACKOFF_BASE,
      maxDelay = 30000, // 30 seconds max
      backoffMultiplier = 2,
      jitter = true,
      onRetry,
      onMaxRetriesReached
    } = options;

    let lastError = originalError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        // Wait before retry (except for first attempt)
        if (attempt > 1) {
          onRetry?.(attempt, lastError);
          await this.delay(delay);
        }

        // Attempt the operation
        return await operation();
      } catch (error) {
        lastError = this.normalizeError(error);
        
        // If this is the last attempt or error is not retryable, give up
        if (attempt === maxAttempts || !lastError.retryable) {
          onMaxRetriesReached?.(lastError);
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if the system is experiencing degraded performance
   */
  isDegraded(): boolean {
    const recentErrors = this.getRecentErrors(60000); // Last minute
    return recentErrors.length > 5; // More than 5 errors in the last minute
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    errorsByCode: Record<RealtimeErrorCode, number>;
    isDegraded: boolean;
  } {
    const recentErrors = this.getRecentErrors(300000); // Last 5 minutes
    const errorsByCode = this.errorQueue.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<RealtimeErrorCode, number>);

    return {
      totalErrors: this.errorQueue.length,
      recentErrors: recentErrors.length,
      errorsByCode,
      isDegraded: this.isDegraded()
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errorQueue = [];
    this.retryQueue.clear();
  }

  /**
   * Get recent errors within a time window
   */
  private getRecentErrors(timeWindowMs: number): RealtimeError[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.errorQueue.filter(error => {
      // Assuming errors have a timestamp property
      return (error as any).timestamp > cutoff;
    });
  }

  /**
   * Normalize different error types to RealtimeError
   */
  private normalizeError(error: Error | RealtimeError): RealtimeError {
    if (error instanceof RealtimeError) {
      return error;
    }

    // Determine error code and retryability based on error message/type
    let code: RealtimeErrorCode = 'UNKNOWN_ERROR';
    let retryable = true;

    if (error.message.includes('network') || error.message.includes('connection')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      code = 'AUTHENTICATION_FAILED';
      retryable = false;
    } else if (error.message.includes('rate limit')) {
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (error.message.includes('publish') || error.message.includes('send')) {
      code = 'PUBLISH_FAILED';
      retryable = true;
    } else if (error.message.includes('subscribe') || error.message.includes('channel')) {
      code = 'SUBSCRIPTION_FAILED';
      retryable = true;
    }

    const realtimeError = new RealtimeError(error.message, code, error, retryable);
    (realtimeError as any).timestamp = Date.now();
    return realtimeError;
  }

  /**
   * Utility function to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Keep error queue size manageable
   */
  private trimErrorQueue(): void {
    const maxErrors = 100;
    if (this.errorQueue.length > maxErrors) {
      this.errorQueue = this.errorQueue.slice(-maxErrors);
    }
  }
}

interface RetryOperation {
  operation: () => Promise<any>;
  attempts: number;
  maxAttempts: number;
  nextRetryTime: number;
}

/**
 * Decorator for automatic retry on real-time operations
 */
export function withRetry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const errorHandler = RealtimeErrorHandler.getInstance();
      
      return errorHandler.handleError(
        new Error('Operation failed'),
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Utility function for graceful degradation
 */
export function withGracefulDegradation<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T> | T,
  options: { timeout?: number } = {}
): Promise<T> {
  const { timeout = 5000 } = options;

  return Promise.race([
    primaryOperation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeout)
    )
  ]).catch(async (error) => {
    console.warn('Primary operation failed, falling back:', error);
    return fallbackOperation();
  });
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new RealtimeError('Circuit breaker is open', 'CONNECTION_FAILED');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

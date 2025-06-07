import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service
    // TODO: Integrate with error tracking service like Sentry
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-cream flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-lg border-2 border-dark hand-drawn shadow-lg text-center">
            <div className="mb-6">
              <AlertTriangle size={64} className="text-error mx-auto mb-4" />
              <h1 className="font-heading font-bold text-2xl text-dark mb-2">
                Oops! Something went sketchy
              </h1>
              <p className="text-medium-gray font-body">
                Our drawing app had a little creative mishap. Don't worry, it happens to the best of artists!
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="font-semibold cursor-pointer text-error mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs bg-off-white p-3 rounded border overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="primary" 
                onClick={this.handleReset}
                className="flex items-center justify-center"
              >
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="secondary" 
                to="/"
                className="flex items-center justify-center"
              >
                <Home size={16} className="mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;</parameter>
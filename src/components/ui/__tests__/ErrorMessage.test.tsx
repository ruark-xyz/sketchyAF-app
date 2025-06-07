import React from 'react';
import { render, screen, fireEvent } from '../../test/utils';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage Component', () => {
  it('renders error message correctly', () => {
    render(<ErrorMessage message="Test error message" />);
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const mockRetry = jest.fn();
    render(<ErrorMessage message="Test error\" onRetry={mockRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<ErrorMessage message="Test error" />);
    
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage message="Test error" className="custom-error" />);
    
    const errorContainer = screen.getByText('Test error').closest('div');
    expect(errorContainer).toHaveClass('custom-error');
  });
});
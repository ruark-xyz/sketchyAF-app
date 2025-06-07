import React from 'react';
import { render, screen } from '../../test/utils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-8', 'w-8'); // Default md size
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByLabelText('Loading')).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByLabelText('Loading')).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByLabelText('Loading')).toHaveClass('h-12', 'w-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    expect(screen.getByLabelText('Loading')).toHaveClass('custom-class');
  });
});
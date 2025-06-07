import React from 'react';
import { render, screen } from '../../test/utils';
import ContentCard from '../ContentCard';

describe('ContentCard Component', () => {
  it('renders children correctly', () => {
    render(
      <ContentCard>
        <p>Test content</p>
      </ContentCard>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies correct padding classes', () => {
    const { rerender } = render(
      <ContentCard padding="sm">Content</ContentCard>
    );
    expect(screen.getByText('Content')).toHaveClass('p-4');

    rerender(<ContentCard padding="md">Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('p-6');

    rerender(<ContentCard padding="lg">Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('p-8');
  });

  it('applies correct background classes', () => {
    const { rerender } = render(
      <ContentCard background="white">Content</ContentCard>
    );
    expect(screen.getByText('Content')).toHaveClass('bg-white');

    rerender(<ContentCard background="off-white">Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('bg-off-white');

    rerender(<ContentCard background="cream">Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('bg-cream');
  });

  it('includes border when enabled', () => {
    render(<ContentCard border={true}>Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('border-2', 'border-dark', 'hand-drawn');
  });

  it('excludes border when disabled', () => {
    render(<ContentCard border={false}>Content</ContentCard>);
    expect(screen.getByText('Content')).not.toHaveClass('border-2');
  });

  it('applies custom className', () => {
    render(<ContentCard className="custom-class">Content</ContentCard>);
    expect(screen.getByText('Content')).toHaveClass('custom-class');
  });
});
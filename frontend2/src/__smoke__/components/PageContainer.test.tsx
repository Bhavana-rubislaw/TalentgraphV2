import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageContainer from '../../components/PageContainer';

describe('PageContainer', () => {
  it('renders children', () => {
    render(
      <PageContainer>
        <p>child content</p>
      </PageContainer>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(
      <PageContainer title="My Title" subtitle="My Subtitle">
        <p>body</p>
      </PageContainer>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Subtitle')).toBeInTheDocument();
  });

  it('omits the title block entirely when no title is given', () => {
    render(
      <PageContainer>
        <p>body</p>
      </PageContainer>
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

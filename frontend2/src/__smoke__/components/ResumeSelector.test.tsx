import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeSelector, { ResumeOption } from '../../components/ResumeSelector';

const resumes: ResumeOption[] = [
  { id: 1, filename: 'resume_v1.pdf', uploaded_at: '2024-03-01T00:00:00Z' },
  { id: 2, filename: 'resume_v2.pdf', uploaded_at: '2024-06-01T00:00:00Z' },
];

describe('ResumeSelector', () => {
  it('renders an empty state with a link back to the profile when there are no resumes', () => {
    render(<ResumeSelector resumes={[]} primaryResumeId={null} onPrimaryChange={vi.fn()} />);
    expect(screen.getByText(/no resumes found in your profile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to profile/i })).toHaveAttribute(
      'href',
      '/candidate/profile'
    );
  });

  it('lists every resume as a select option', () => {
    render(<ResumeSelector resumes={resumes} primaryResumeId={null} onPrimaryChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'resume_v1.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'resume_v2.pdf' })).toBeInTheDocument();
  });

  it('shows the selected-resume hint only when a primary resume is set', () => {
    const { rerender } = render(
      <ResumeSelector resumes={resumes} primaryResumeId={null} onPrimaryChange={vi.fn()} />
    );
    expect(screen.queryByText(/uploaded/i)).not.toBeInTheDocument();

    rerender(<ResumeSelector resumes={resumes} primaryResumeId={2} onPrimaryChange={vi.fn()} />);
    expect(screen.getByText('resume_v2.pdf', { selector: 'strong' })).toBeInTheDocument();
  });

  it('calls onPrimaryChange with the selected resume id', async () => {
    const onPrimaryChange = vi.fn();
    render(<ResumeSelector resumes={resumes} primaryResumeId={null} onPrimaryChange={onPrimaryChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '2');
    expect(onPrimaryChange).toHaveBeenCalledWith(2);
  });

  it('calls onPrimaryChange with null when the placeholder is reselected', async () => {
    const onPrimaryChange = vi.fn();
    render(<ResumeSelector resumes={resumes} primaryResumeId={1} onPrimaryChange={onPrimaryChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    expect(onPrimaryChange).toHaveBeenCalledWith(null);
  });
});

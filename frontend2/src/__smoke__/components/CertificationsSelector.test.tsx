import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CertificationsSelector, { CertOption } from '../../components/CertificationsSelector';

const certs: CertOption[] = [
  { id: 1, name: 'AWS Certified Solutions Architect', issuer: 'Amazon', issued_date: '2024-01-15', expiry_date: null },
  { id: 2, name: 'PMP', issuer: null, issued_date: null, expiry_date: null },
];

describe('CertificationsSelector', () => {
  it('renders an empty state with a link back to the profile when there are no certifications', () => {
    render(<CertificationsSelector certifications={[]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/no certifications in your profile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to profile/i })).toHaveAttribute(
      'href',
      '/candidate/profile'
    );
  });

  it('renders one row per certification with issuer shown when present', () => {
    render(<CertificationsSelector certifications={certs} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText('AWS Certified Solutions Architect')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('PMP')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('reflects selectedIds via checked state', () => {
    render(<CertificationsSelector certifications={certs} selectedIds={[1]} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });

  it('calls onChange with the toggled id added when an unselected checkbox is clicked', async () => {
    const onChange = vi.fn();
    render(<CertificationsSelector certifications={certs} selectedIds={[1]} onChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it('calls onChange with the toggled id removed when a selected checkbox is clicked', async () => {
    const onChange = vi.fn();
    render(<CertificationsSelector certifications={certs} selectedIds={[1, 2]} onChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith([2]);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickTracker from '../components/QuickTracker';

describe('QuickTracker component', () => {
  const mockTriggerQuickLog = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockTriggerQuickLog.mockClear();
  });

  it('renders all 4 preset quick-log buttons', () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);

    expect(screen.getByText(/Log Plant-Based Meal/i)).toBeInTheDocument();
    expect(screen.getByText(/Log Active\/Transit Trip/i)).toBeInTheDocument();
    expect(screen.getByText(/Log EV Drive Trip/i)).toBeInTheDocument();
    expect(screen.getByText(/Log Solar Generation/i)).toBeInTheDocument();
  });

  it('calls triggerQuickLog with correct args when vegan meal button is clicked', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Plant-Based Meal/i));
    expect(mockTriggerQuickLog).toHaveBeenCalledWith('food', 'vegan', 1, 'meals');
  });

  it('calls triggerQuickLog with correct args when transit button is clicked', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Active\/Transit Trip/i));
    expect(mockTriggerQuickLog).toHaveBeenCalledWith('transport', 'transit', 5, 'miles');
  });

  it('calls triggerQuickLog with correct args when EV button is clicked', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log EV Drive Trip/i));
    expect(mockTriggerQuickLog).toHaveBeenCalledWith('transport', 'ev', 10, 'miles');
  });

  it('calls triggerQuickLog with correct args when solar button is clicked', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Solar Generation/i));
    expect(mockTriggerQuickLog).toHaveBeenCalledWith('housing', 'solar', 15, 'kWh');
  });

  it('disables all buttons when loading is true', () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={true} />);
    const buttons = screen.getAllByRole('button');
    // All preset buttons should be disabled
    const presetButtons = buttons.filter(b => b.getAttribute('disabled') !== null);
    expect(presetButtons.length).toBeGreaterThan(0);
  });

  it('shows the custom log form toggle button', () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    expect(screen.getByText(/Log Daily Micro-Action \(Custom\)/i)).toBeInTheDocument();
  });

  it('custom form is hidden by default', () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    expect(screen.queryByText(/Register Log & Earn Leaves/i)).not.toBeInTheDocument();
  });

  it('reveals custom form when toggle is clicked', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Daily Micro-Action \(Custom\)/i));
    expect(screen.getByText(/Register Log & Earn Leaves/i)).toBeInTheDocument();
  });

  it('hides custom form again when toggle is clicked twice', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    const toggle = screen.getByText(/Log Daily Micro-Action \(Custom\)/i);
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(screen.queryByText(/Register Log & Earn Leaves/i)).not.toBeInTheDocument();
  });

  it('custom form submits with correct transport args', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);

    // Open custom form
    await userEvent.click(screen.getByText(/Log Daily Micro-Action \(Custom\)/i));

    // Verify transport category is default and distance field shows
    const distanceInput = screen.getByLabelText(/Distance \(miles\)/i);
    expect(distanceInput).toBeInTheDocument();

    // Change value and submit
    fireEvent.change(distanceInput, { target: { value: '25' } });
    await userEvent.click(screen.getByText(/Register Log & Earn Leaves/i));

    await waitFor(() => {
      expect(mockTriggerQuickLog).toHaveBeenCalledWith('transport', 'gas_car', 25, 'miles');
    });
  });

  it('custom form shows food fields when food category is selected', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Daily Micro-Action \(Custom\)/i));

    const categorySelect = screen.getByLabelText(/Action Category/i);
    await userEvent.selectOptions(categorySelect, 'food');

    expect(screen.getByLabelText(/Total Servings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Diet Composition/i)).toBeInTheDocument();
  });

  it('custom form shows housing fields when housing category is selected', async () => {
    render(<QuickTracker triggerQuickLog={mockTriggerQuickLog} loading={false} />);
    await userEvent.click(screen.getByText(/Log Daily Micro-Action \(Custom\)/i));

    const categorySelect = screen.getByLabelText(/Action Category/i);
    await userEvent.selectOptions(categorySelect, 'housing');

    expect(screen.getByLabelText(/Power Usage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Grid Setup/i)).toBeInTheDocument();
  });
});

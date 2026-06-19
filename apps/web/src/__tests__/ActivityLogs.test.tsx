import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CarbonEvent } from '@footprint/shared-types';
import ActivityLogs from '../components/ActivityLogs';

// Helper: build a minimal CarbonEvent fixture
function makeEvent(overrides: Partial<CarbonEvent> = {}): CarbonEvent {
  return {
    id: crypto.randomUUID(),
    user_id: 'user-1',
    category: 'transport',
    source_provider: 'manual',
    raw_value: 10,
    raw_unit: 'miles',
    computed_co2e_kg: 3,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('ActivityLogs component', () => {
  const mockDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => mockDelete.mockClear());

  it('renders the panel title', () => {
    render(<ActivityLogs events={[]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText(/Footprint Activity Logs/i)).toBeInTheDocument();
  });

  it('shows empty state message when no events', () => {
    render(<ActivityLogs events={[]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText(/No activities match/i)).toBeInTheDocument();
  });

  it('shows "0 total logs" count when empty', () => {
    render(<ActivityLogs events={[]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText(/0 total logs/i)).toBeInTheDocument();
  });

  it('renders correct number of log rows', () => {
    const events = [makeEvent(), makeEvent(), makeEvent()];
    render(<ActivityLogs events={events} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText(/3 total logs/i)).toBeInTheDocument();
    // Each event has a delete button
    const deleteButtons = screen.getAllByTitle(/Delete activity log/i);
    expect(deleteButtons).toHaveLength(3);
  });

  it('renders transport event with correct emoji', () => {
    const event = makeEvent({ category: 'transport', source_provider: 'manual', raw_value: 10, computed_co2e_kg: 3 });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });

  it('renders food event with correct emoji', () => {
    const event = makeEvent({ category: 'food', raw_value: 3, computed_co2e_kg: 1.5, raw_unit: 'meals' });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText('🥗')).toBeInTheDocument();
  });

  it('renders housing event with correct emoji', () => {
    const event = makeEvent({ category: 'housing', source_provider: 'manual', raw_value: 100, computed_co2e_kg: 38, raw_unit: 'kWh' });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText('🏠')).toBeInTheDocument();
  });

  it('shows CO2e amount for each log row', () => {
    const event = makeEvent({ computed_co2e_kg: 38 });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);
    expect(screen.getByText(/38 kg CO2e/i)).toBeInTheDocument();
  });

  it('calls deleteCarbonEvent with correct id when delete button is clicked', async () => {
    const event = makeEvent({ id: 'event-to-delete' });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);
    const deleteBtn = screen.getByTitle(/Delete activity log/i);
    await userEvent.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledWith('event-to-delete');
  });

  it('disables delete buttons when loading is true', () => {
    const event = makeEvent();
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={true} />);
    const deleteBtn = screen.getByTitle(/Delete activity log/i);
    expect(deleteBtn).toBeDisabled();
  });

  it('search filter: shows only matching events', async () => {
    const ev1 = makeEvent({ category: 'food', raw_value: 3, computed_co2e_kg: 9, raw_unit: 'meals' });
    const ev2 = makeEvent({ category: 'transport', raw_value: 10, computed_co2e_kg: 3, raw_unit: 'miles' });
    render(<ActivityLogs events={[ev1, ev2]} deleteCarbonEvent={mockDelete} loading={false} />);

    const searchBox = screen.getByPlaceholderText(/Search logs/i);
    await userEvent.type(searchBox, 'food');

    // Only food event should still be visible
    const deleteButtons = screen.getAllByTitle(/Delete activity log/i);
    expect(deleteButtons).toHaveLength(1);
  });

  it('search filter: shows empty state when no match', async () => {
    const event = makeEvent({ category: 'transport' });
    render(<ActivityLogs events={[event]} deleteCarbonEvent={mockDelete} loading={false} />);

    const searchBox = screen.getByPlaceholderText(/Search logs/i);
    await userEvent.type(searchBox, 'zzznomatch');

    expect(screen.getByText(/No activities match/i)).toBeInTheDocument();
  });
});

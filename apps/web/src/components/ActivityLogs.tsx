import React from 'react';
import type { CarbonEvent } from '@footprint/shared-types';
import { Database, Trash2 } from 'lucide-react';

interface ActivityLogsProps {
  events: CarbonEvent[];
  deleteCarbonEvent: (id: string) => Promise<void>;
  loading: boolean;
}

// Helper: Reconstruct details description for carbon events
function getEventDetails(event: CarbonEvent): string {
  const { category, raw_value, raw_unit, computed_co2e_kg, source_provider } = event;
  const provider = source_provider as string;
  if (category === 'transport') {
    if (provider === 'radar_sdk') {
      return `Radar GPS trip: ${raw_value} ${raw_unit}`;
    }
    if (raw_value > 0) {
      const factor = computed_co2e_kg / raw_value;
      if (Math.abs(factor - 0.03) < 0.01) return `Public Transit/Bike (${raw_value} mi)`;
      if (Math.abs(factor - 0.08) < 0.01) return `Electric EV trip (${raw_value} mi)`;
      if (Math.abs(factor - 0.18) < 0.02) return `Hybrid Vehicle trip (${raw_value} mi)`;
      if (Math.abs(factor - 0.3) < 0.02) return `Gas Sedan trip (${raw_value} mi)`;
      if (Math.abs(factor - 0.45) < 0.05) return `Gas SUV trip (${raw_value} mi)`;
    }
    return `Transit commute: ${raw_value} ${raw_unit}`;
  }
  if (category === 'food') {
    if (raw_value > 0) {
      const factor = computed_co2e_kg / raw_value;
      if (Math.abs(factor - 0.5) < 0.1) return `Plant-based/Vegan meal (${raw_value} serving${raw_value > 1 ? 's' : ''})`;
      if (Math.abs(factor - 1.5) < 0.2) return `Balanced/Poultry meal (${raw_value} serving${raw_value > 1 ? 's' : ''})`;
      if (Math.abs(factor - 3.0) < 0.3) return `Beef/Pork heavy meal (${raw_value} serving${raw_value > 1 ? 's' : ''})`;
    }
    return `Dietary intake: ${raw_value} ${raw_unit}`;
  }
  if (category === 'housing') {
    if (provider === 'arcadia') {
      return `Arcadia Utility billing: ${raw_value} ${raw_unit}`;
    }
    if (provider === 'nest') {
      return `Nest Thermostat Eco check: ${raw_value} ${raw_unit}`;
    }
    if (raw_value > 0) {
      const factor = computed_co2e_kg / raw_value;
      if (Math.abs(factor - 0.38 * 0.15) < 0.02) return `Solar rooftop grid offset (${raw_value} kWh)`;
      if (Math.abs(factor - 0.38 * 0.85) < 0.05) return `Smart Nest Thermostat heating (${raw_value} kWh)`;
      if (Math.abs(factor - 0.38) < 0.05) return `Standard home grid heating (${raw_value} kWh)`;
    }
    return `Utility grid usage: ${raw_value} ${raw_unit}`;
  }
  return `${category} activity: ${raw_value} ${raw_unit}`;
}

export default function ActivityLogs({
  events,
  deleteCarbonEvent,
  loading
}: ActivityLogsProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const details = getEventDetails(e).toLowerCase();
    const source = e.source_provider.toLowerCase();
    const category = e.category.toLowerCase();
    return details.includes(query) || source.includes(query) || category.includes(query);
  });
  return (
    <div className="panel-card glass-panel">
      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} color="var(--primary)" /> Footprint Activity Logs
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'normal' }}>
          {events.length} total logs
        </span>
      </h2>

      {/* Search Filter */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search logs by category or details..."
          aria-label="Search activity logs"
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '13px' }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEvents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredEvents.map(e => {
            const details = getEventDetails(e);
            const dateStr = new Date(e.timestamp).toLocaleDateString('default', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Category emoji & colors
            let categoryEmoji = '🌱';
            let badgeBg = 'rgba(255,255,255,0.05)';
            let badgeColor = 'var(--text-muted)';

            if (e.category === 'housing') {
              categoryEmoji = '🏠';
              badgeBg = 'rgba(16, 185, 129, 0.1)';
              badgeColor = 'hsl(150, 90%, 65%)';
            } else if (e.category === 'transport') {
              categoryEmoji = '🚗';
              badgeBg = 'rgba(59, 130, 246, 0.1)';
              badgeColor = 'hsl(217, 91%, 65%)';
            } else if (e.category === 'food') {
              categoryEmoji = '🥗';
              badgeBg = 'rgba(251, 191, 36, 0.1)';
              badgeColor = 'hsl(45, 100%, 55%)';
            }

            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                className="activity-item-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{categoryEmoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {details}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: badgeBg,
                        color: badgeColor,
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {e.source_provider}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                    {Math.round(e.computed_co2e_kg)} kg CO2e
                  </span>

                  <button
                    type="button"
                    onClick={() => deleteCarbonEvent(e.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    className="delete-activity-btn"
                    title="Delete activity log"
                    aria-label={`Delete activity log: ${details} on ${dateStr}`}
                    disabled={loading}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          No activities match your search.
        </div>
      )}
    </div>
  );
}

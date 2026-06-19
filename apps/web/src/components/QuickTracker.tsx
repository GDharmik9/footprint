import { Leaf, Zap } from 'lucide-react';

interface QuickTrackerProps {
  triggerQuickLog: (category: 'food' | 'transport' | 'housing', modeOrOption: string, value: number, unit: string) => Promise<void>;
  loading: boolean;
}

export default function QuickTracker({ triggerQuickLog, loading }: QuickTrackerProps) {
  return (
    <div className="panel-card glass-panel" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Zap size={20} color="var(--accent)" /> 1-Click Quick Tracker
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Log common green habits instantly to track reductions and earn bonus Leaves.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={() => triggerQuickLog('food', 'vegan', 1, 'meals')}
          disabled={loading}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🥗</span> Log Plant-Based Meal
          </span>
          <span style={{ color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            +25 <Leaf size={14} fill="var(--leaves-xp)" />
          </span>
        </button>

        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={() => triggerQuickLog('transport', 'transit', 5, 'miles')}
          disabled={loading}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🚲</span> Log Active/Transit Trip (5 mi)
          </span>
          <span style={{ color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            +30 <Leaf size={14} fill="var(--leaves-xp)" />
          </span>
        </button>

        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0.2) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={() => triggerQuickLog('transport', 'ev', 10, 'miles')}
          disabled={loading}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔌</span> Log EV Drive Trip (10 mi)
          </span>
          <span style={{ color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            +30 <Leaf size={14} fill="var(--leaves-xp)" />
          </span>
        </button>

        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.2) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%'
          }}
          onClick={() => triggerQuickLog('housing', 'solar', 15, 'kWh')}
          disabled={loading}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>☀️</span> Log Solar Generation (15 kWh)
          </span>
          <span style={{ color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            +35 <Leaf size={14} fill="var(--leaves-xp)" />
          </span>
        </button>
      </div>
    </div>
  );
}

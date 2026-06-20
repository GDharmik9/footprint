interface CarbonTrajectoryProps {
  totalFootprint: number;
  targetTons: number;
  baselineTons: number;
  simReduction: number;
  carbonEquivalentsDescription: string;
}

export default function CarbonTrajectory({
  totalFootprint,
  targetTons,
  baselineTons,
  simReduction,
  carbonEquivalentsDescription
}: CarbonTrajectoryProps) {
  return (
    <div className="panel-card glass-panel">
      <div className="trajectory-header">
        <div>
          <span className="simulator-title" style={{ fontSize: '12px' }}>Projected Annual Trajectory</span>
          <div className="trajectory-value">
            {totalFootprint} <span>Tons CO2e / Yr</span>
          </div>
        </div>
        <div className="target-info">
          <div>Target: <strong>{targetTons} Tons</strong></div>
          <div>Baseline: {baselineTons} Tons</div>
        </div>
      </div>

      <div className="trajectory-progress-container">
        <div className="progress-bar-container" style={{ height: '14px' }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(100, (totalFootprint / baselineTons) * 100)}%`,
              background: totalFootprint <= targetTons
                ? 'linear-gradient(90deg, var(--primary), var(--accent))'
                : 'linear-gradient(90deg, var(--warning), var(--danger))'
            }}
          />
        </div>
        <div className="trajectory-sub-bar">
          <span>Eco Warrior (0T)</span>
          <span>Target ({targetTons}T)</span>
          <span>Onboarding Baseline ({baselineTons}T)</span>
        </div>
      </div>

      {simReduction > 0 ? (
        <div className="projected-reduction-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="reduction-label">Projected Annual Reduction:</span>
            <span className="reduction-value">-{simReduction} Tons/Yr</span>
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85, color: 'var(--accent)', marginTop: '4px', textAlign: 'left' }}>
            🌿 {carbonEquivalentsDescription}
          </div>
        </div>
      ) : (
        <div className="projected-reduction-banner" style={{ background: 'hsla(346, 84%, 61%, 0.1)', borderColor: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="reduction-label" style={{ color: 'var(--danger)' }}>Above Onboarding Target:</span>
            <span className="reduction-value" style={{ color: 'var(--danger)' }}>+{Math.abs(simReduction)} Tons/Yr</span>
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85, color: 'var(--danger)', marginTop: '4px', textAlign: 'left' }}>
            ⚠️ Try using the Simulator below to lower your annual projected trajectory.
          </div>
        </div>
      )}
    </div>
  );
}

import { Sparkles, Leaf } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'housing' | 'transport' | 'food';
  type: string;
  value: number;
  unit: string;
  impactKg: number;
  rewardLeaves: number;
}

interface AICoachProps {
  coachInsights: string[];
  recommendations: Recommendation[];
  triggerQuickLog: (category: 'food' | 'transport' | 'housing', type: string, value: number, unit: string) => Promise<void>;
  loading: boolean;
}

export default function AICoach({
  coachInsights,
  recommendations,
  triggerQuickLog,
  loading
}: AICoachProps) {
  return (
    <div className="panel-card glass-panel" style={{ background: 'linear-gradient(135deg, hsla(142, 70%, 45%, 0.1) 0%, hsla(224, 45%, 12%, 0.85) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '4px' }}>
      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={20} color="var(--primary)" /> AI Climate Coach
      </h2>

      {/* Insights Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {coachInsights.map((insight, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: '3px solid var(--primary)',
              padding: '10px 14px',
              borderRadius: '0 8px 8px 0',
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
              textAlign: 'left'
            }}
          >
            {insight}
          </div>
        ))}
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div>
          <span className="simulator-title" style={{ fontSize: '11px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
            Recommended Micro-Actions
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map(rec => {
              let badgeBg = 'rgba(255,255,255,0.05)';
              let badgeColor = 'var(--text-muted)';

              if (rec.category === 'housing') {
                badgeBg = 'rgba(16, 185, 129, 0.1)';
                badgeColor = 'hsl(150, 90%, 65%)';
              } else if (rec.category === 'transport') {
                badgeBg = 'rgba(59, 130, 246, 0.1)';
                badgeColor = 'hsl(217, 91%, 65%)';
              } else if (rec.category === 'food') {
                badgeBg = 'rgba(251, 191, 36, 0.1)';
                badgeColor = 'hsl(45, 100%, 55%)';
              }

              return (
                <div
                  key={rec.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  className="rec-action-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
                        {rec.title}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                        {rec.description}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: badgeBg,
                      color: badgeColor,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}>
                      {rec.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                        🍃 Avoids {rec.impactKg} kg CO2e
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--leaves-xp)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        +{rec.rewardLeaves} <Leaf size={12} fill="var(--leaves-xp)" style={{ display: 'inline' }} />
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        width: 'auto',
                        margin: 0,
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        boxShadow: 'none'
                      }}
                      onClick={() => triggerQuickLog(rec.category, rec.type, rec.value, rec.unit)}
                      disabled={loading}
                    >
                      Log Action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

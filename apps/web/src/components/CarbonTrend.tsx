import { Activity, Leaf } from 'lucide-react';

interface ChartDataPoint {
  housing: number;
  transport: number;
  food: number;
  total: number;
  label: string;
}

interface CarbonTrendProps {
  chartData: ChartDataPoint[];
  chartViewMode: 'total' | 'breakdown';
  setChartViewMode: (mode: 'total' | 'breakdown') => void;
  carbonEquivalentsDescription: (val: number) => string;
}

export default function CarbonTrend({
  chartData,
  chartViewMode,
  setChartViewMode,
  carbonEquivalentsDescription
}: CarbonTrendProps) {
  return (
    <div className="panel-card glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary)" /> Emitted Carbon Trend
        </h2>
        {chartData.length > 0 && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setChartViewMode('total')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: chartViewMode === 'total' ? 'var(--primary)' : 'transparent',
                color: chartViewMode === 'total' ? 'white' : 'var(--text-dim)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('breakdown')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: chartViewMode === 'breakdown' ? 'var(--primary)' : 'transparent',
                color: chartViewMode === 'breakdown' ? 'white' : 'var(--text-dim)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              Breakdown
            </button>
          </div>
        )}
      </div>

      {chartData.length > 0 ? (
        <div>
          <div className="chart-container">
            <svg className="chart-svg" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="housingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(150, 90%, 60%)" />
                  <stop offset="100%" stopColor="hsl(142, 70%, 40%)" />
                </linearGradient>
                <linearGradient id="transportGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(217, 91%, 65%)" />
                  <stop offset="100%" stopColor="hsl(224, 80%, 50%)" />
                </linearGradient>
                <linearGradient id="foodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(45, 100%, 55%)" />
                  <stop offset="100%" stopColor="hsl(34, 97%, 45%)" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />

              {/* Chart Rendering */}
              {chartViewMode === 'total' ? (
                (() => {
                  const maxVal = Math.max(...chartData.map(d => d.total), 1);
                  const coords = chartData.map((d, index) => {
                    const x = 40 + (index / (chartData.length - 1 || 1)) * 340;
                    const y = 170 - (d.total / maxVal) * 140;
                    return { x, y, label: d.label, val: d.total };
                  });

                  const pathD = coords.reduce((acc, c, i) => i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`, '');
                  const areaD = coords.length > 0
                    ? `${pathD} L ${coords[coords.length - 1].x} 170 L ${coords[0].x} 170 Z`
                    : '';

                  return (
                    <>
                      {/* Shaded Area */}
                      {areaD && <path d={areaD} fill="url(#chartGrad)" />}
                      {/* Connected Line */}
                      {pathD && <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}

                      {/* Points */}
                      {coords.map((c, i) => (
                        <g key={i}>
                          <circle cx={c.x} cy={c.y} r="4" fill="var(--accent)" stroke="var(--bg-dark)" strokeWidth="1.5" />
                          <text x={c.x} y={c.y - 10} fill="var(--text-main)" fontSize="8" textAnchor="middle" fontWeight="600">
                            {Math.round(c.val)} kg
                          </text>
                          <text x={c.x} y="190" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                            {c.label}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()
              ) : (
                // Stacked Bar Chart breakdown
                (() => {
                  const maxVal = Math.max(...chartData.map(d => d.total), 1);
                  return chartData.map((d, index) => {
                    const cX = 40 + (index / (chartData.length - 1 || 1)) * 340;
                    const barWidth = 20;

                    const hHousing = (d.housing / maxVal) * 140;
                    const hTransport = (d.transport / maxVal) * 140;
                    const hFood = (d.food / maxVal) * 140;

                    const yHousing = 170 - hHousing;
                    const yTransport = yHousing - hTransport;
                    const yFood = yTransport - hFood;

                    return (
                      <g key={index}>
                        {/* Housing Segment */}
                        {hHousing > 0 && (
                          <rect x={cX - barWidth / 2} y={yHousing} width={barWidth} height={hHousing} fill="url(#housingGrad)" rx="1.5" />
                        )}
                        {/* Transport Segment */}
                        {hTransport > 0 && (
                          <rect x={cX - barWidth / 2} y={yTransport} width={barWidth} height={hTransport} fill="url(#transportGrad)" rx="1.5" />
                        )}
                        {/* Food Segment */}
                        {hFood > 0 && (
                          <rect x={cX - barWidth / 2} y={yFood} width={barWidth} height={hFood} fill="url(#foodGrad)" rx="1.5" />
                        )}
                        {/* Total Value text */}
                        <text x={cX} y={yFood - 8} fill="var(--text-main)" fontSize="8" textAnchor="middle" fontWeight="600">
                          {Math.round(d.total)} kg
                        </text>
                        {/* Month Label */}
                        <text x={cX} y="190" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                          {d.label}
                        </text>
                      </g>
                    );
                  });
                })()
              )}

              <line x1="40" y1="170" x2="380" y2="170" stroke="var(--border-color)" strokeWidth="1" />
            </svg>
          </div>

          {/* Legend for breakdown */}
          {chartViewMode === 'breakdown' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(150, 90%, 60%), hsl(142, 70%, 40%))' }} />
                🏠 Housing
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(217, 91%, 65%), hsl(224, 80%, 50%))' }} />
                🚗 Transport
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(34, 97%, 45%))' }} />
                🥗 Food
              </span>
            </div>
          )}

          {(() => {
            const latestMonth = chartData[chartData.length - 1];
            return (
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                <strong style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Leaf size={14} color="var(--primary)" /> Latest Month Context ({latestMonth.label}):
                </strong>
                <span style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Your total monthly footprint of **{Math.round(latestMonth.total)} kg CO2e** is {carbonEquivalentsDescription(latestMonth.total)}
                </span>
              </div>
            );
          })()}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          No tracking events registered yet.
        </p>
      )}
    </div>
  );
}

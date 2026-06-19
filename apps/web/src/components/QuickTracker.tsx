import React, { useState } from 'react';
import { Leaf, Zap, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface QuickTrackerProps {
  triggerQuickLog: (category: 'food' | 'transport' | 'housing', modeOrOption: string, value: number, unit: string) => Promise<void>;
  loading: boolean;
}

export default function QuickTracker({ triggerQuickLog, loading }: QuickTrackerProps) {
  // Custom log form state
  const [showCustom, setShowCustom] = useState(false);
  const [logCategory, setLogCategory] = useState<'transport' | 'housing' | 'food'>('transport');
  const [logValue, setLogValue] = useState<number>(10);
  const [logTransportMode, setLogTransportMode] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [logDietType, setLogDietType] = useState<'meat' | 'balanced' | 'vegan'>('balanced');
  const [logHousingOption, setLogHousingOption] = useState<'standard' | 'smart_thermostat' | 'solar'>('standard');

  const handleCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const unit = logCategory === 'housing' ? 'kWh' : logCategory === 'transport' ? 'miles' : 'meals';
    const modeOrOption =
      logCategory === 'transport' ? logTransportMode :
      logCategory === 'food' ? logDietType :
      logHousingOption;
    await triggerQuickLog(logCategory, modeOrOption, logValue, unit);
  };

  return (
    <div className="panel-card glass-panel" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Zap size={20} color="var(--accent)" /> 1-Click Quick Tracker
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Log common green habits instantly to track reductions and earn bonus Leaves.
      </p>

      {/* Preset Quick-Log Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          type="button"
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', width: '100%'
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', width: '100%'
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0.2) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', width: '100%'
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
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.2) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', width: '100%'
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

      {/* Divider + Custom Log Toggle */}
      <div style={{ margin: '16px 0 0 0', borderTop: '1px solid var(--border-color)' }} />
      <button
        type="button"
        aria-expanded={showCustom}
        aria-controls="custom-log-form"
        onClick={() => setShowCustom(v => !v)}
        style={{
          marginTop: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600, padding: '0',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={13} /> Log Daily Micro-Action (Custom)
        </span>
        {showCustom ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Collapsible Custom Log Form */}
      {showCustom && (
        <form
          id="custom-log-form"
          onSubmit={handleCustomLog}
          style={{
            marginTop: '14px',
            display: 'flex', flexDirection: 'column', gap: '12px',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Category */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="custom-category-select">Action Category</label>
            <select
              id="custom-category-select"
              className="input-field"
              value={logCategory}
              onChange={e => setLogCategory(e.target.value as typeof logCategory)}
            >
              <option value="transport">Transit / Commute</option>
              <option value="housing">Utility / Electric Billing</option>
              <option value="food">Dietary Meals</option>
            </select>
          </div>

          {/* Transport fields */}
          {logCategory === 'transport' && (
            <div className="form-row">
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-transport-value">Distance (miles)</label>
                <input
                  id="custom-transport-value"
                  type="number"
                  min={0}
                  className="input-field"
                  value={logValue}
                  onChange={e => setLogValue(Number(e.target.value))}
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-transport-mode">Vehicle Type</label>
                <select
                  id="custom-transport-mode"
                  className="input-field"
                  value={logTransportMode}
                  onChange={e => setLogTransportMode(e.target.value as typeof logTransportMode)}
                >
                  <option value="suv">Gas SUV</option>
                  <option value="gas_car">Gas Sedan</option>
                  <option value="hybrid">Hybrid Vehicle</option>
                  <option value="ev">Electric EV</option>
                  <option value="transit">Public Transit / Bike</option>
                </select>
              </div>
            </div>
          )}

          {/* Housing fields */}
          {logCategory === 'housing' && (
            <div className="form-row">
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-housing-value">Power Usage (kWh)</label>
                <input
                  id="custom-housing-value"
                  type="number"
                  min={0}
                  className="input-field"
                  value={logValue}
                  onChange={e => setLogValue(Number(e.target.value))}
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-housing-option">Grid Setup</label>
                <select
                  id="custom-housing-option"
                  className="input-field"
                  value={logHousingOption}
                  onChange={e => setLogHousingOption(e.target.value as typeof logHousingOption)}
                >
                  <option value="standard">Standard Grid</option>
                  <option value="smart_thermostat">Smart Nest Installed</option>
                  <option value="solar">Solar Rooftop Setup</option>
                </select>
              </div>
            </div>
          )}

          {/* Food fields */}
          {logCategory === 'food' && (
            <div className="form-row">
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-food-value">Total Servings / Meals</label>
                <input
                  id="custom-food-value"
                  type="number"
                  min={0}
                  className="input-field"
                  value={logValue}
                  onChange={e => setLogValue(Number(e.target.value))}
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-diet-select">Diet Composition</label>
                <select
                  id="custom-diet-select"
                  className="input-field"
                  value={logDietType}
                  onChange={e => setLogDietType(e.target.value as typeof logDietType)}
                >
                  <option value="meat">Beef / Pork Heavy</option>
                  <option value="balanced">Balanced / Poultry</option>
                  <option value="vegan">Plant-based / Vegan</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '10px' }} disabled={loading}>
            Register Log & Earn Leaves 🍃
          </button>
        </form>
      )}
    </div>
  );
}

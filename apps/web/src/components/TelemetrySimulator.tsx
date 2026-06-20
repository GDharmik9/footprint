import { Activity } from 'lucide-react';

interface TelemetrySimulatorProps {
  simRadarDistance: number;
  setSimRadarDistance: (val: number) => void;
  simRadarMode: 'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit';
  setSimRadarMode: (val: 'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit') => void;
  simArcadiaKwh: number;
  setSimArcadiaKwh: (val: number) => void;
  simNestEco: boolean;
  setSimNestEco: (val: boolean) => void;
  triggerRadarWebhook: () => Promise<void>;
  triggerArcadiaWebhook: () => Promise<void>;
  triggerNestWebhook: () => Promise<void>;
  loading: boolean;
}

export default function TelemetrySimulator({
  simRadarDistance,
  setSimRadarDistance,
  simRadarMode,
  setSimRadarMode,
  simArcadiaKwh,
  setSimArcadiaKwh,
  simNestEco,
  setSimNestEco,
  triggerRadarWebhook,
  triggerArcadiaWebhook,
  triggerNestWebhook,
  loading
}: TelemetrySimulatorProps) {
  return (
    <div className="panel-card glass-panel">
      <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={20} color="var(--primary)" /> Telemetry Webhooks Simulator
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Simulate incoming telemetry data stream from connected services (Radar SDK, Arcadia Utility, Nest Thermostat) to test backend ingestion pipeline.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Radar.io Webhook Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--accent)' }}>📡 Radar.io Transit SDK</div>
          <div className="form-row" style={{ marginBottom: '10px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trip Distance (Miles)</label>
              <input
                type="number"
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '14px' }}
                value={simRadarDistance}
                onChange={e => setSimRadarDistance(Number(e.target.value))}
              />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Transit Mode</label>
              <select
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '14px' }}
                value={simRadarMode}
                onChange={e => setSimRadarMode(e.target.value as 'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit')}
              >
                <option value="suv">Gas SUV</option>
                <option value="gas_car">Gas Sedan</option>
                <option value="hybrid">Hybrid</option>
                <option value="ev">Electric EV</option>
                <option value="transit">Transit/Bike</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', width: 'auto' }}
            onClick={triggerRadarWebhook}
            disabled={loading}
          >
            Simulate Radar Ingestion
          </button>
        </div>

        {/* Arcadia Webhook Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'hsl(200, 80%, 50%)' }}>🔌 Arcadia Utility Billing</div>
          <div className="input-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Power Billing (kWh)</label>
            <input
              type="number"
              className="input-field"
              style={{ padding: '8px 12px', fontSize: '14px' }}
              value={simArcadiaKwh}
              onChange={e => setSimArcadiaKwh(Number(e.target.value))}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', background: 'linear-gradient(135deg, hsl(200, 80%, 40%) 0%, hsl(200, 80%, 50%) 100%)', width: 'auto' }}
            onClick={triggerArcadiaWebhook}
            disabled={loading}
          >
            Simulate Arcadia Billing
          </button>
        </div>

        {/* Nest Webhook Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--warning)' }}>🏡 Google Nest Thermostat</div>
          <div className="input-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thermostat Mode</label>
            <select
              className="input-field"
              style={{ padding: '8px 12px', fontSize: '14px' }}
              value={simNestEco ? 'eco' : 'standard'}
              onChange={e => setSimNestEco(e.target.value === 'eco')}
            >
              <option value="standard">Standard HVAC heating/cooling</option>
              <option value="eco">Nest Eco-Mode Active</option>
            </select>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--warning) 0%, var(--leaves-xp) 100%)', width: 'auto' }}
            onClick={triggerNestWebhook}
            disabled={loading}
          >
            Simulate Nest Telemetry Check
          </button>
        </div>
      </div>
    </div>
  );
}

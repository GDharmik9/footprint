import { Leaf } from 'lucide-react';

interface CountryConfig {
  name: string;
  pattern: string;
}

interface CalibrationSurveyProps {
  setIsCalibrating: (val: boolean) => void;
  calibrationStep: number;
  housingArchetype: string;
  dietArchetype: string;
  commuteArchetype: string;
  nextCalibrationStep: (payload?: Record<string, unknown>) => void;
  displayName: string;
  setDisplayName: (val: string) => void;
  postalCode: string;
  handleChangePostalCode: (e: React.ChangeEvent<HTMLInputElement>) => void;
  country: string;
  countryConfigs: Record<string, CountryConfig>;
  handleProgressiveProfileUpdate: (payload: Record<string, unknown>) => Promise<void>;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function CalibrationSurvey({
  setIsCalibrating,
  calibrationStep,
  housingArchetype,
  dietArchetype,
  commuteArchetype,
  nextCalibrationStep,
  displayName,
  setDisplayName,
  postalCode,
  handleChangePostalCode,
  country,
  countryConfigs,
  handleProgressiveProfileUpdate,
  triggerToast
}: CalibrationSurveyProps) {
  return (
    <div className="panel-card glass-panel calibration-widget-container" style={{ margin: '0 24px 24px 24px', padding: '24px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <Leaf size={20} fill="var(--primary)" /> Calibrate Your Carbon Footprint (Step {calibrationStep}/4)
        </h3>
        <button
          onClick={() => {
            setIsCalibrating(false);
            localStorage.setItem('footprint_calibration_completed', 'true');
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
        >
          Skip Setup
        </button>
      </div>

      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ width: `${(calibrationStep / 4) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
      </div>

      {calibrationStep === 1 && (
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            What type of home infrastructure best represents your living situation? This sets your housing baseline.
          </p>
          <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div
              className={`selector-option ${housingArchetype === 'apartment' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ housing: 'apartment' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏢</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>City Apartment</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Shared walls, low utility load</span>
            </div>
            <div
              className={`selector-option ${housingArchetype === 'townhouse' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ housing: 'townhouse' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏡</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Townhouse</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Moderate spacing and utilities</span>
            </div>
            <div
              className={`selector-option ${housingArchetype === 'family' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ housing: 'family' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏰</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Single Family Home</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Detached, higher heating load</span>
            </div>
          </div>
        </div>
      )}

      {calibrationStep === 2 && (
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            How would you describe your typical dietary choices? Food accounts for up to a third of personal emissions.
          </p>
          <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div
              className={`selector-option ${dietArchetype === 'vegan' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ diet: 'vegan' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🥗</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Plant-Forward</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Vegan or vegetarian baseline</span>
            </div>
            <div
              className={`selector-option ${dietArchetype === 'balanced' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ diet: 'balanced' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🍗</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Balanced</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>White meat, grains, low red meat</span>
            </div>
            <div
              className={`selector-option ${dietArchetype === 'meat' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ diet: 'meat' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🥩</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Meat Enthusiast</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Regular beef, pork, dairy heavy</span>
            </div>
          </div>
        </div>
      )}

      {calibrationStep === 3 && (
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            How do you typically commute or travel? Transport represents the largest source of transit emissions.
          </p>
          <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div
              className={`selector-option ${commuteArchetype === 'transit' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ commute: 'transit' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🚲</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Transit / Bike / Walk</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Subway, bus, active modes</span>
            </div>
            <div
              className={`selector-option ${commuteArchetype === 'hybrid' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ commute: 'hybrid' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🔌</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>Hybrid / EV</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Efficient electric/hybrid vehicle</span>
            </div>
            <div
              className={`selector-option ${commuteArchetype === 'gas' ? 'selected' : ''}`}
              onClick={() => nextCalibrationStep({ commute: 'gas' })}
              style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🚗</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>SUV / Sedan</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Standard gas-powered vehicle</span>
            </div>
          </div>
        </div>
      )}

      {calibrationStep === 4 && (
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            Customize your display name and location to wrap up calibration. We auto-detected these from your IP.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', marginBottom: '20px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calibrate-name">Display Name</label>
              <input
                id="calibrate-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calibrate-zip">Postal / Zip Code</label>
              <input
                id="calibrate-zip"
                type="text"
                value={postalCode}
                onChange={handleChangePostalCode}
                className="input-field"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px' }}
            onClick={async () => {
              const cleanCode = postalCode.trim();
              if (cleanCode) {
                const config = countryConfigs[country];
                const localRegex = new RegExp(config.pattern);
                if (!localRegex.test(cleanCode)) {
                  triggerToast(`Please enter a valid postal code for ${config.name}.`, 'error');
                  return;
                }
              }
              await handleProgressiveProfileUpdate({
                displayName,
                postalCode
              });
              setIsCalibrating(false);
              localStorage.setItem('footprint_calibration_completed', 'true');
              triggerToast('Calibration complete! Eco-Sphere updated.', 'success');
            }}
          >
            Finish Calibration!
          </button>
        </div>
      )}
    </div>
  );
}

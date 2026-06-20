import React from 'react';
import { Leaf } from 'lucide-react';

interface CountryConfig {
  name: string;
  placeholder: string;
}

interface OnboardingFlowProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  postalCode: string;
  handleChangePostalCode: (e: React.ChangeEvent<HTMLInputElement>) => void;
  housingArchetype: 'apartment' | 'townhouse' | 'family';
  setHousingArchetype: (val: 'apartment' | 'townhouse' | 'family') => void;
  commuteArchetype: 'transit' | 'hybrid' | 'gas';
  setCommuteArchetype: (val: 'transit' | 'hybrid' | 'gas') => void;
  dietArchetype: 'vegan' | 'balanced' | 'meat';
  setDietArchetype: (val: 'vegan' | 'balanced' | 'meat') => void;
  handleOnboarding: (e: React.FormEvent) => void;
  loading: boolean;
  countryConfigs: Record<string, CountryConfig>;
}

export default function OnboardingFlow({
  displayName,
  setDisplayName,
  country,
  setCountry,
  postalCode,
  handleChangePostalCode,
  housingArchetype,
  setHousingArchetype,
  commuteArchetype,
  setCommuteArchetype,
  dietArchetype,
  setDietArchetype,
  handleOnboarding,
  loading,
  countryConfigs
}: OnboardingFlowProps) {
  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Leaf size={24} color="hsl(150, 90%, 60%)" /> Footprint
        </div>
      </header>

      <div className="onboarding-container">
        <h1 className="onboarding-title">Replace carbon guilt with action.</h1>
        <p className="onboarding-subtitle">Estimate your context-aware environmental baseline in 90 seconds.</p>

        <form onSubmit={handleOnboarding} className="onboarding-card glass-panel">
          <div className="input-group">
            <label htmlFor="name-input">Display Name</label>
            <input
              id="name-input"
              type="text"
              placeholder="How should we call you?"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="country-select">Country</label>
            <select
              id="country-select"
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="input-field"
              style={{ appearance: 'none', background: 'var(--bg-dark)', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              {Object.entries(countryConfigs).map(([code, config]) => (
                <option key={code} value={code}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="zip-input">Postal / Zip Code</label>
            <input
              id="zip-input"
              type="text"
              placeholder={countryConfigs[country]?.placeholder}
              value={postalCode}
              onChange={handleChangePostalCode}
              className="input-field"
            />
          </div>

          <div className="archetype-section">
            <h3>1. Housing Infrastructure</h3>
            <div className="grid-selector">
              <div
                className={`selector-option ${housingArchetype === 'apartment' ? 'selected' : ''}`}
                onClick={() => setHousingArchetype('apartment')}
              >
                <span className="icon">🏢</span>
                <span className="option-label">City Apartment</span>
                <span className="option-desc">Shared walls, low heating requirements</span>
              </div>
              <div
                className={`selector-option ${housingArchetype === 'townhouse' ? 'selected' : ''}`}
                onClick={() => setHousingArchetype('townhouse')}
              >
                <span className="icon">🏡</span>
                <span className="option-label">Townhouse</span>
                <span className="option-desc">Moderate spacing and utility use</span>
              </div>
              <div
                className={`selector-option ${housingArchetype === 'family' ? 'selected' : ''}`}
                onClick={() => setHousingArchetype('family')}
              >
                <span className="icon">🏰</span>
                <span className="option-label">Single Family</span>
                <span className="option-desc">Detached setup, high heating/cooling</span>
              </div>
            </div>
          </div>

          <div className="archetype-section">
            <h3>2. Commute & Transit</h3>
            <div className="grid-selector">
              <div
                className={`selector-option ${commuteArchetype === 'transit' ? 'selected' : ''}`}
                onClick={() => setCommuteArchetype('transit')}
              >
                <span className="icon">🚲</span>
                <span className="option-label">Transit / Bike</span>
                <span className="option-desc">Subway, bus, cycle, walking options</span>
              </div>
              <div
                className={`selector-option ${commuteArchetype === 'hybrid' ? 'selected' : ''}`}
                onClick={() => setCommuteArchetype('hybrid')}
              >
                <span className="icon">🔌</span>
                <span className="option-label">Hybrid / EV</span>
                <span className="option-desc">Partially electrified or highly efficient</span>
              </div>
              <div
                className={`selector-option ${commuteArchetype === 'gas' ? 'selected' : ''}`}
                onClick={() => setCommuteArchetype('gas')}
              >
                <span className="icon">🚗</span>
                <span className="option-label">SUV / Sedan</span>
                <span className="option-desc">Standard internal combustion engine</span>
              </div>
            </div>
          </div>

          <div className="archetype-section">
            <h3>3. Dietary Choices</h3>
            <div className="grid-selector">
              <div
                className={`selector-option ${dietArchetype === 'vegan' ? 'selected' : ''}`}
                onClick={() => setDietArchetype('vegan')}
              >
                <span className="icon">🥗</span>
                <span className="option-label">Plant-Forward</span>
                <span className="option-desc">Vegan or low-dairy vegetarian diets</span>
              </div>
              <div
                className={`selector-option ${dietArchetype === 'balanced' ? 'selected' : ''}`}
                onClick={() => setDietArchetype('balanced')}
              >
                <span className="icon">🍗</span>
                <span className="option-label">Balanced</span>
                <span className="option-desc">White meats, grains, low red meat</span>
              </div>
              <div
                className={`selector-option ${dietArchetype === 'meat' ? 'selected' : ''}`}
                onClick={() => setDietArchetype('meat')}
              >
                <span className="icon">🥩</span>
                <span className="option-label">Meat Enthusiast</span>
                <span className="option-desc">Regular beef, pork, dairy heavy</span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Generating eco-profile...' : 'Generate My Eco-Sphere'}
          </button>
        </form>
      </div>
    </div>
  );
}

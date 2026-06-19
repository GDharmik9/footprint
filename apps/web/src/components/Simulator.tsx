import { TrendingDown, Home, Zap, Leaf, Car, Activity, Utensils } from 'lucide-react';

interface SimulatorProps {
  simHousing: 'standard' | 'smart_thermostat' | 'solar';
  setSimHousing: (v: 'standard' | 'smart_thermostat' | 'solar') => void;
  simTransport: 'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit';
  setSimTransport: (v: 'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit') => void;
  simDiet: 'meat' | 'balanced' | 'vegan';
  setSimDiet: (v: 'meat' | 'balanced' | 'vegan') => void;
  housingImpact: number;
  transportImpact: number;
  foodImpact: number;
}

export default function Simulator({
  simHousing,
  setSimHousing,
  simTransport,
  setSimTransport,
  simDiet,
  setSimDiet,
  housingImpact,
  transportImpact,
  foodImpact
}: SimulatorProps) {
  return (
    <div className="panel-card glass-panel">
      <h2 className="panel-title"><TrendingDown size={20} color="var(--accent)" /> Life Swap Simulator</h2>

      <div className="simulator-group">
        <div className="simulator-label">
          <span className="simulator-title">Housing Grid & Thermostat</span>
          <span className="simulator-impact">{housingImpact} Tons/Yr</span>
        </div>
        <div className="simulator-options-row">
          <button
            className={`simulator-option-btn ${simHousing === 'standard' ? 'active' : ''}`}
            onClick={() => setSimHousing('standard')}
          >
            <Home size={14} /> Standard Grid
          </button>
          <button
            className={`simulator-option-btn ${simHousing === 'smart_thermostat' ? 'active' : ''}`}
            onClick={() => setSimHousing('smart_thermostat')}
          >
            <Zap size={14} /> Smart Nest
          </button>
          <button
            className={`simulator-option-btn ${simHousing === 'solar' ? 'active' : ''}`}
            onClick={() => setSimHousing('solar')}
          >
            <Leaf size={14} /> Solar Roof
          </button>
        </div>
      </div>

      <div className="simulator-group">
        <div className="simulator-label">
          <span className="simulator-title">Transport & Travel Mode</span>
          <span className="simulator-impact">{transportImpact} Tons/Yr</span>
        </div>
        <div className="simulator-options-row">
          <button
            className={`simulator-option-btn ${simTransport === 'suv' ? 'active' : ''}`}
            onClick={() => setSimTransport('suv')}
          >
            <Car size={14} /> Drive SUV
          </button>
          <button
            className={`simulator-option-btn ${simTransport === 'gas_car' ? 'active' : ''}`}
            onClick={() => setSimTransport('gas_car')}
          >
            <Car size={14} /> Sedan
          </button>
          <button
            className={`simulator-option-btn ${simTransport === 'hybrid' ? 'active' : ''}`}
            onClick={() => setSimTransport('hybrid')}
          >
            <Zap size={14} /> Hybrid/EV
          </button>
          <button
            className={`simulator-option-btn ${simTransport === 'transit' ? 'active' : ''}`}
            onClick={() => setSimTransport('transit')}
          >
            <Activity size={14} /> Bike/Transit
          </button>
        </div>
      </div>

      <div className="simulator-group">
        <div className="simulator-label">
          <span className="simulator-title">Dietary Choices</span>
          <span className="simulator-impact">{foodImpact} Tons/Yr</span>
        </div>
        <div className="simulator-options-row">
          <button
            className={`simulator-option-btn ${simDiet === 'meat' ? 'active' : ''}`}
            onClick={() => setSimDiet('meat')}
          >
            <Utensils size={14} /> Meat Heavy
          </button>
          <button
            className={`simulator-option-btn ${simDiet === 'balanced' ? 'active' : ''}`}
            onClick={() => setSimDiet('balanced')}
          >
            <Utensils size={14} /> Poultry/Flex
          </button>
          <button
            className={`simulator-option-btn ${simDiet === 'vegan' ? 'active' : ''}`}
            onClick={() => setSimDiet('vegan')}
          >
            <Utensils size={14} /> Vegan Swap
          </button>
        </div>
      </div>
    </div>
  );
}

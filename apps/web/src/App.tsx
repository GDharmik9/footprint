import { Leaf, RefreshCw, CheckCircle } from 'lucide-react';
import './App.css';
import QuickTracker from './components/QuickTracker';
import Simulator from './components/Simulator';
import ActivityLogs from './components/ActivityLogs';
import OnboardingFlow from './components/OnboardingFlow';
import CalibrationSurvey from './components/CalibrationSurvey';
import CarbonTrajectory from './components/CarbonTrajectory';
import AICoach from './components/AICoach';
import CarbonTrend from './components/CarbonTrend';
import TelemetrySimulator from './components/TelemetrySimulator';
import CommunityLeaderboard from './components/CommunityLeaderboard';
import SponsorRewards from './components/SponsorRewards';
import HabitChallenges from './components/HabitChallenges';

import { COUNTRY_CONFIGS } from './utils/dashboardUtils';
import { getCarbonEquivalentsDescription } from '@footprint/carbon-math';
import { useDashboard } from './hooks/useDashboard';

export default function App() {
  const {
    user,
    loading,
    isCalibrating,
    setIsCalibrating,
    calibrationStep,
    displayName,
    setDisplayName,
    country,
    setCountry,
    postalCode,
    handleChangePostalCode,
    housingArchetype,
    setHousingArchetype,
    dietArchetype,
    setDietArchetype,
    commuteArchetype,
    setCommuteArchetype,
    events,
    chartViewMode,
    setChartViewMode,
    challenges,
    vouchers,
    simHousing,
    setSimHousing,
    simTransport,
    setSimTransport,
    simDiet,
    setSimDiet,
    toast,
    ecoSphereTab,
    setEcoSphereTab,
    leaderboard,
    coachInsights,
    recommendations,
    simRadarDistance,
    setSimRadarDistance,
    simRadarMode,
    setSimRadarMode,
    simArcadiaKwh,
    setSimArcadiaKwh,
    simNestEco,
    setSimNestEco,
    triggerToast,
    handleLogout,
    deleteCarbonEvent,
    triggerQuickLog,
    handleOnboarding,
    toggleChallengeDay,
    redeemVoucher,
    triggerRadarWebhook,
    triggerArcadiaWebhook,
    triggerNestWebhook,
    nextCalibrationStep,
    handleProgressiveProfileUpdate,
    simFootprint,
    baselineTons,
    targetTons,
    simReduction,
    chartData
  } = useDashboard();

  // Render Loading Screen if loading user profile initially
  if (loading && !user) {
    return (
      <div className="app-container">
        <header>
          <div className="logo"><Leaf size={24} color="hsl(150, 90%, 60%)" /> Footprint</div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
          <RefreshCw size={32} color="var(--primary)" style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading your Eco-Sphere...</p>
        </div>
      </div>
    );
  }

  // Render Onboarding Screen if user is not set
  if (!user) {
    return (
      <OnboardingFlow
        displayName={displayName}
        setDisplayName={setDisplayName}
        country={country}
        setCountry={setCountry}
        postalCode={postalCode}
        handleChangePostalCode={handleChangePostalCode}
        housingArchetype={housingArchetype}
        setHousingArchetype={setHousingArchetype}
        commuteArchetype={commuteArchetype}
        setCommuteArchetype={setCommuteArchetype}
        dietArchetype={dietArchetype}
        setDietArchetype={setDietArchetype}
        handleOnboarding={handleOnboarding}
        loading={loading}
        countryConfigs={COUNTRY_CONFIGS}
      />
    );
  }

  // Render Main Dashboard
  return (
    <div className="app-container">
      {toast && (
        <div 
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1000,
            background: toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            animation: 'slideIn 0.3s ease'
          }}
        >
          <CheckCircle size={18} />
          {toast.message}
        </div>
      )}

      <header>
        <div className="logo">
          <Leaf size={24} color="hsl(150, 90%, 60%)" />
          <span>Footprint</span>
        </div>

        <div className="user-status-widget">
          <div className="leaves-badge glow-leaves">
            <Leaf size={16} fill="var(--leaves-xp)" />
            <span>{user.total_leaves} Leaves</span>
          </div>
          <div className="level-badge">
            Level {user.current_level}
          </div>
          <button onClick={handleLogout} className="btn-secondary" title="Logout" aria-label="Logout" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {isCalibrating && user && (
        <CalibrationSurvey
          setIsCalibrating={setIsCalibrating}
          calibrationStep={calibrationStep}
          housingArchetype={housingArchetype}
          dietArchetype={dietArchetype}
          commuteArchetype={commuteArchetype}
          nextCalibrationStep={nextCalibrationStep}
          displayName={displayName}
          setDisplayName={setDisplayName}
          postalCode={postalCode}
          handleChangePostalCode={handleChangePostalCode}
          country={country}
          countryConfigs={COUNTRY_CONFIGS}
          handleProgressiveProfileUpdate={handleProgressiveProfileUpdate}
          triggerToast={triggerToast}
        />
      )}

      <div className="dashboard-grid">
        {/* Left Side: Carbon Stats, Simulator, History chart */}
        <div className="left-panel">
          <CarbonTrajectory
            totalFootprint={simFootprint.total}
            targetTons={targetTons}
            baselineTons={baselineTons}
            simReduction={simReduction}
            carbonEquivalentsDescription={getCarbonEquivalentsDescription(simReduction * 1000)}
          />

          <Simulator
            simHousing={simHousing}
            setSimHousing={setSimHousing}
            simTransport={simTransport}
            setSimTransport={setSimTransport}
            simDiet={simDiet}
            setSimDiet={setSimDiet}
            housingImpact={simFootprint.housing}
            transportImpact={simFootprint.transport}
            foodImpact={simFootprint.food}
          />

          <AICoach
            coachInsights={coachInsights}
            recommendations={recommendations}
            triggerQuickLog={triggerQuickLog}
            loading={loading}
          />

          <CarbonTrend
            chartData={chartData}
            chartViewMode={chartViewMode}
            setChartViewMode={setChartViewMode}
            carbonEquivalentsDescription={(total) => getCarbonEquivalentsDescription(total)}
          />

          <TelemetrySimulator
            simRadarDistance={simRadarDistance}
            setSimRadarDistance={setSimRadarDistance}
            simRadarMode={simRadarMode}
            setSimRadarMode={setSimRadarMode}
            simArcadiaKwh={simArcadiaKwh}
            setSimArcadiaKwh={setSimArcadiaKwh}
            simNestEco={simNestEco}
            setSimNestEco={setSimNestEco}
            triggerRadarWebhook={triggerRadarWebhook}
            triggerArcadiaWebhook={triggerArcadiaWebhook}
            triggerNestWebhook={triggerNestWebhook}
            loading={loading}
          />
        </div>

        {/* Right Side: Eco-Sphere Visual, Challenges, Ad Campaigns */}
        <div className="right-panel">
          <CommunityLeaderboard
            ecoSphereTab={ecoSphereTab}
            setEcoSphereTab={setEcoSphereTab}
            user={user}
            leaderboard={leaderboard}
          />

          <QuickTracker
            triggerQuickLog={triggerQuickLog}
            loading={loading}
          />

          <SponsorRewards
            vouchers={vouchers}
            redeemVoucher={redeemVoucher}
          />

          <HabitChallenges
            challenges={challenges}
            toggleChallengeDay={toggleChallengeDay}
          />

          <ActivityLogs
            events={events}
            deleteCarbonEvent={deleteCarbonEvent}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

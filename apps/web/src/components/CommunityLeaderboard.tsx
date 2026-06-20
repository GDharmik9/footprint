import { Leaf } from 'lucide-react';
import EcoSphere from './EcoSphere';
import type { User } from '@footprint/shared-types';

interface LeaderboardMember {
  id: string;
  userId: string;
  username: string;
  level: number;
  leaves: number;
}

interface CommunityLeaderboardProps {
  ecoSphereTab: 'sphere' | 'league';
  setEcoSphereTab: (tab: 'sphere' | 'league') => void;
  user: User;
  leaderboard: LeaderboardMember[];
}

export default function CommunityLeaderboard({
  ecoSphereTab,
  setEcoSphereTab,
  user,
  leaderboard
}: CommunityLeaderboardProps) {
  return (
    <div className="panel-card glass-panel" style={{ position: 'relative' }}>
      {/* Tabs Header */}
      <div className="flex justify-center border-b mb-5" style={{ borderColor: 'var(--border-color)', borderBottomWidth: '1px', borderBottomStyle: 'solid', display: 'flex', gap: '16px' }}>
        <button
          type="button"
          className="pb-2 font-display font-bold text-sm transition-all"
          style={{
            borderBottomColor: ecoSphereTab === 'sphere' ? 'var(--accent)' : 'transparent',
            color: ecoSphereTab === 'sphere' ? 'var(--accent)' : 'var(--text-dim)',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            cursor: 'pointer',
            fontSize: '14px',
            paddingBottom: '8px',
            fontWeight: 700
          }}
          onClick={() => setEcoSphereTab('sphere')}
        >
          Virtual Eco-Sphere
        </button>
        <button
          type="button"
          className="pb-2 font-display font-bold text-sm transition-all"
          style={{
            borderBottomColor: ecoSphereTab === 'league' ? 'var(--accent)' : 'transparent',
            color: ecoSphereTab === 'league' ? 'var(--accent)' : 'var(--text-dim)',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            cursor: 'pointer',
            fontSize: '14px',
            paddingBottom: '8px',
            fontWeight: 700
          }}
          onClick={() => setEcoSphereTab('league')}
        >
          Eco-Leagues Leaderboard
        </button>
      </div>

      {ecoSphereTab === 'sphere' ? (
        <div style={{ textAlign: 'center' }}>
          <div className="ecosphere-widget">
            <EcoSphere level={user.current_level} />
            <div className="ecosphere-label">Eco-Sphere Level {user.current_level}</div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Level up your habitat and watch new branches, flowers, and silver birches grow by earning Leaves!
          </p>
        </div>
      ) : (
        <div className="leaderboard-container" style={{ maxHeight: '330px', overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Competitor</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Leaves</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leaderboard.map((member, index) => {
              const isCurrentUser = member.userId === user.id;
              return (
                <div
                  key={member.id}
                  style={{
                    background: isCurrentUser ? 'var(--accent-glow)' : 'rgba(0, 0, 0, 0.2)',
                    borderColor: isCurrentUser ? 'var(--accent)' : 'var(--border-color)',
                    borderRadius: '8px',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrentUser ? '0 0 10px var(--accent-glow)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', width: '24px', textAlign: 'center', color: isCurrentUser ? 'var(--accent)' : 'var(--text-dim)' }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: isCurrentUser ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {member.username} {isCurrentUser && ' (You)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                      Lvl {member.level}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {member.leaves} <Leaf size={12} fill="var(--leaves-xp)" style={{ display: 'inline' }} />
                    </span>
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

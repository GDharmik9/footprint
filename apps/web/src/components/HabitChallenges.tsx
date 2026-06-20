import { Calendar, CheckCircle } from 'lucide-react';
import type { Challenge } from '@footprint/shared-types';

interface HabitChallengesProps {
  challenges: Challenge[];
  toggleChallengeDay: (challengeType: 'cold-wash' | 'vampire-hunt', dayIndex: number, currentlyCompleted: boolean) => Promise<void>;
}

export default function HabitChallenges({
  challenges,
  toggleChallengeDay
}: HabitChallengesProps) {
  return (
    <div className="panel-card glass-panel">
      <h2 className="panel-title"><Calendar size={20} color="var(--primary)" /> Habit Challenges</h2>

      {challenges.map(c => (
        <div key={c.id} className="challenge-card">
          <div className="challenge-header">
            <span className="challenge-name">{c.title}</span>
            <span className="challenge-reward">+{c.rewardLeaves} Leaves</span>
          </div>
          <p className="challenge-desc">{c.description}</p>

          <div className="challenge-days-grid">
            {c.progressLogs.map((completed, idx) => (
              <div key={idx} className="day-checkbox-wrapper">
                <div
                  className={`day-checkbox ${completed ? 'completed' : ''}`}
                  onClick={() => toggleChallengeDay(c.type, idx, completed)}
                >
                  {completed ? '✓' : ''}
                </div>
                <span className="day-label">D{idx + 1}</span>
              </div>
            ))}
          </div>

          <div className="challenge-footer">
            <span className="streak-counter">🔥 {c.currentStreak} Day Streak</span>
            {c.completed ? (
              <span style={{ color: 'var(--accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={14} /> Completed
              </span>
            ) : (
              <span style={{ color: 'var(--text-dim)' }}>In Progress</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

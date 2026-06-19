
interface EcoSphereProps {
  level: number;
}

export default function EcoSphere({ level }: EcoSphereProps) {
  return (
    <svg className="ecosphere-svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="sphereGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="hsl(150, 90%, 65%)" stopOpacity="0.4" />
          <stop offset="70%" stopColor="hsl(142, 70%, 25%)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="hsl(224, 45%, 8%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(34, 25%, 35%)" />
          <stop offset="100%" stopColor="hsl(34, 25%, 20%)" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(150, 90%, 60%)" />
          <stop offset="100%" stopColor="hsl(142, 70%, 35%)" />
        </linearGradient>
      </defs>

      {/* Global glowing glass background dome */}
      <circle cx="50" cy="50" r="45" fill="url(#sphereGrad)" stroke="hsla(150, 90%, 60%, 0.15)" strokeWidth="0.5" />

      {/* Core Habitat Base (soil) */}
      <path d="M 15 75 Q 50 65 85 75 Q 85 85 85 85 Q 50 90 15 85 Z" fill="hsl(34, 25%, 22%)" opacity="0.9" />
      <path d="M 20 74 Q 50 68 80 74" stroke="hsl(142, 60%, 30%)" strokeWidth="1.5" fill="none" />

      {/* Level 1 Sprout */}
      {level >= 1 && (
        <>
          {/* Trunk */}
          <path d="M 49 75 Q 49 60 51 55" stroke="url(#trunkGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Leaf 1 */}
          <path d="M 51 55 Q 56 48 51 44 Q 46 48 51 55" fill="url(#leafGrad)" />
        </>
      )}

      {/* Level 2 Sapling addition */}
      {level >= 2 && (
        <>
          {/* Left Branch */}
          <path d="M 50 65 Q 42 58 38 56" stroke="url(#trunkGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Left Leaf */}
          <path d="M 38 56 Q 32 54 33 49 Q 39 51 38 56" fill="url(#leafGrad)" />
        </>
      )}

      {/* Level 3 Crown growth addition */}
      {level >= 3 && (
        <>
          {/* Right Branch */}
          <path d="M 50 62 Q 58 55 64 53" stroke="url(#trunkGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Right Leaf */}
          <path d="M 64 53 Q 70 51 71 46 Q 65 48 64 53" fill="url(#leafGrad)" />
          {/* Center Bush Top */}
          <circle cx="50" cy="42" r="6" fill="url(#leafGrad)" opacity="0.85" />
        </>
      )}

      {/* Level 4 Full bloom flowers & extra density */}
      {level >= 4 && (
        <>
          <circle cx="43" cy="48" r="5" fill="url(#leafGrad)" opacity="0.9" />
          <circle cx="58" cy="46" r="5" fill="url(#leafGrad)" opacity="0.9" />
          {/* Flowers */}
          <circle cx="50" cy="42" r="1.5" fill="hsl(346, 84%, 61%)" />
          <circle cx="38" cy="56" r="1.2" fill="hsl(45, 100%, 50%)" />
          <circle cx="64" cy="53" r="1.2" fill="hsl(45, 100%, 50%)" />
        </>
      )}

      {/* Level 5+ Silver Birch growth addition */}
      {level >= 5 && (
        <>
          {/* Second Tree trunk (Silver Birch) */}
          <path d="M 68 75 Q 67 60 70 48" stroke="hsl(210, 40%, 90%)" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Birch branch */}
          <path d="M 69 60 Q 75 54 78 52" stroke="hsl(210, 40%, 90%)" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* Birch leaves */}
          <path d="M 78 52 Q 83 50 82 46 Q 77 48 78 52" fill="hsl(150, 90%, 65%)" />
          <path d="M 70 48 Q 72 40 68 36 Q 65 40 70 48" fill="hsl(150, 90%, 65%)" />

          {/* Floating glowing leaf particles */}
          <circle cx="30" cy="40" r="0.8" fill="var(--accent)" className="glow-leaves" />
          <circle cx="68" cy="30" r="0.8" fill="var(--leaves-xp)" className="glow-leaves" />
          <circle cx="52" cy="32" r="0.6" fill="var(--accent)" className="glow-leaves" />
        </>
      )}
    </svg>
  );
}

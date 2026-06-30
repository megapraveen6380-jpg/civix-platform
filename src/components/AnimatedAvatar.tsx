import React from 'react';
import { motion } from 'motion/react';

interface AnimatedAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  isAnimated?: boolean;
}

export default function AnimatedAvatar({ 
  seed, 
  size = 120, 
  className = '', 
  isAnimated = true 
}: AnimatedAvatarProps) {
  
  // A simple string hash to generate consistent numbers from any string seed
  const getHash = (str: string) => {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const hash = getHash(seed || "default_citizen_91_praveen");

  // Derive unique features based on hash
  const themeIndex = hash % 6;
  const hairStyleIndex = (hash >> 2) % 5;
  const eyesStyleIndex = (hash >> 4) % 4;
  const skinToneIndex = (hash >> 6) % 4;
  const shirtColorIndex = (hash >> 8) % 6;
  const accessoryIndex = (hash >> 10) % 5;
  const speedOffset = 1 + (hash % 3) * 0.5; // Custom floating/rotating speeds

  // 1. Gradients
  const gradients = [
    { from: '#10b981', to: '#059669', text: 'Emerald Shield', bg: 'bg-emerald-500/10' }, // Emerald
    { from: '#6366f1', to: '#4f46e5', text: 'Royal Indigo', bg: 'bg-indigo-500/10' }, // Indigo
    { from: '#f59e0b', to: '#d97706', text: 'Amber Beacon', bg: 'bg-amber-500/10' }, // Amber
    { from: '#ec4899', to: '#db2777', text: 'Rose Sentinel', bg: 'bg-rose-500/10' }, // Rose
    { from: '#06b6d4', to: '#0891b2', text: 'Cyan Aura', bg: 'bg-cyan-500/10' }, // Cyan
    { from: '#8b5cf6', to: '#7c3aed', text: 'Violet Crest', bg: 'bg-violet-500/10' }, // Violet
  ];
  const activeGradient = gradients[themeIndex];

  // 2. Skin Tones
  const skinTones = ['#FAD0C4', '#F4A261', '#E07A5F', '#D4A373'];
  const activeSkin = skinTones[skinToneIndex];

  // 3. Shirt Colors
  const shirtColors = ['#1E3A8A', '#064E3B', '#78350F', '#581C87', '#701A75', '#0F172A'];
  const activeShirt = shirtColors[shirtColorIndex];

  return (
    <div 
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 1. Pulsing Ambient Halo */}
      {isAnimated && (
        <motion.div 
          className="absolute inset-0 rounded-full bg-radial opacity-20 blur-sm"
          style={{
            background: `radial-gradient(circle, ${activeGradient.from} 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.35, 0.15]
          }}
          transition={{
            duration: 3 / speedOffset,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* 2. Rotating Orbital Dots (Interactive Civic Compass) */}
      {isAnimated && (
        <motion.div 
          className="absolute inset-[-6px]"
          animate={{ rotate: 360 }}
          transition={{
            duration: 12 / speedOffset,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle cx="50" cy="5" r="3.5" fill={activeGradient.from} className="opacity-90 shadow-md" />
            <circle cx="95" cy="50" r="2" fill={activeGradient.to} className="opacity-50" />
            <circle cx="50" cy="95" r="3" fill={activeGradient.from} className="opacity-70" />
            <circle cx="5" cy="50" r="1.5" fill={activeGradient.to} className="opacity-40" />
            <path 
              d="M 50 5 A 45 45 0 0 1 95 50" 
              fill="none" 
              stroke={activeGradient.from} 
              strokeWidth="0.75" 
              strokeDasharray="2 3" 
              className="opacity-30" 
            />
            <path 
              d="M 50 95 A 45 45 0 0 1 5 50" 
              fill="none" 
              stroke={activeGradient.to} 
              strokeWidth="0.75" 
              strokeDasharray="2 3" 
              className="opacity-30" 
            />
          </svg>
        </motion.div>
      )}

      {/* 3. Main Avatar Card Layer */}
      <motion.div 
        className="w-full h-full rounded-full border-2 overflow-hidden shadow-lg relative bg-white"
        style={{ borderColor: activeGradient.from }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        {/* Colorful dynamic background */}
        <div 
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${activeGradient.from}dd, ${activeGradient.to}ff)`
          }}
        />

        {/* Dynamic Abstract Landscape / Wave Patterns inside background */}
        <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path d="M0 25 C30 10, 70 35, 100 20 L100 40 L0 40 Z" fill="#ffffff" />
          <path d="M0 15 C40 30, 60 5, 100 15 L100 40 L0 40 Z" fill="#ffffff" className="opacity-50" />
        </svg>

        {/* 4. The Human Character (constructed with beautiful animated SVG nodes) */}
        <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 100">
          <defs>
            <clipPath id={`avatar-clip-${hash}`}>
              <circle cx="50" cy="50" r="48" />
            </clipPath>
            {/* Soft shadows */}
            <filter id={`shadow-${hash}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodOpacity="0.15" />
            </filter>
          </defs>

          <g clipPath={`url(#avatar-clip-${hash})`}>
            {/* A. Shoulders & Shirt */}
            <path 
              d="M 22 92 C 22 76, 32 70, 50 70 C 68 70, 78 76, 78 92 Z" 
              fill={activeShirt} 
              filter={`url(#shadow-${hash})`}
            />
            {/* Citizen badge tie/collar detail */}
            <path d="M 44 70 L 50 82 L 56 70 Z" fill="#ffffff" className="opacity-90" />
            <path d="M 48 70 L 50 92 L 52 70 Z" fill={activeGradient.from} />

            {/* B. Neck */}
            <rect x="45" y="58" width="10" height="15" rx="2" fill={activeSkin} style={{ filter: 'brightness(0.9)' }} />

            {/* C. Head / Face */}
            <circle cx="50" cy="45" r="19" fill={activeSkin} filter={`url(#shadow-${hash})`} />

            {/* D. Hair */}
            {hairStyleIndex === 0 && (
              // Short spikes
              <path d="M 29 40 C 29 20, 71 20, 71 40 C 67 36, 61 36, 50 38 C 39 36, 33 36, 29 40 Z" fill="#1e293b" />
            )}
            {hairStyleIndex === 1 && (
              // Clean curly/short crop
              <g fill="#0f172a">
                <circle cx="50" cy="27" r="10" />
                <circle cx="41" cy="29" r="8" />
                <circle cx="59" cy="29" r="8" />
                <circle cx="34" cy="35" r="6" />
                <circle cx="66" cy="35" r="6" />
              </g>
            )}
            {hairStyleIndex === 2 && (
              // Elegant bun / top knot
              <g fill="#1e293b">
                <path d="M 31 43 C 30 25, 70 25, 69 43 C 65 39, 58 37, 50 37 C 42 37, 35 39, 31 43 Z" />
                <circle cx="50" cy="22" r="7" className="animate-pulse" />
              </g>
            )}
            {hairStyleIndex === 3 && (
              // Traditional Cap / Headband
              <g>
                <path d="M 31 41 C 31 27, 69 27, 69 41 Z" fill="#475569" />
                <rect x="31" y="34" width="38" height="6" fill={activeGradient.from} rx="1" />
              </g>
            )}
            {hairStyleIndex === 4 && (
              // Dynamic Side-Part
              <path d="M 31 42 C 30 24, 60 20, 70 38 C 65 37, 50 36, 42 38 Z" fill="#2d1e18" />
            )}

            {/* E. Eyes (with blinking animation if isAnimated) */}
            <g>
              {eyesStyleIndex === 0 && (
                // Focused/Standard Eyes
                <g fill="#1e293b">
                  <circle cx="43" cy="43" r="2.2" />
                  <circle cx="57" cy="43" r="2.2" />
                  <circle cx="44.2" cy="41.8" r="0.8" fill="#ffffff" />
                  <circle cx="58.2" cy="41.8" r="0.8" fill="#ffffff" />
                  {/* Blinking layer */}
                  {isAnimated && (
                    <motion.rect 
                      x="39" y="39" width="22" height="6" fill={activeSkin}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: [0, 0, 1, 0, 0] }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatType: "loop",
                        times: [0, 0.94, 0.96, 0.98, 1]
                      }}
                      style={{ originY: 0 }}
                    />
                  )}
                </g>
              )}
              {eyesStyleIndex === 1 && (
                // Cool glasses / Speculates
                <g>
                  {/* Glass frames */}
                  <circle cx="42" cy="43" r="5" fill="none" stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx="58" cy="43" r="5" fill="none" stroke="#0f172a" strokeWidth="1.5" />
                  <line x1="47" y1="43" x2="53" y2="43" stroke="#0f172a" strokeWidth="1.5" />
                  {/* Shimmer reflection */}
                  <line x1="39" y1="40" x2="43" y2="44" stroke="#ffffff" strokeWidth="0.75" className="opacity-75" />
                  <line x1="55" y1="40" x2="59" y2="44" stroke="#ffffff" strokeWidth="0.75" className="opacity-75" />
                </g>
              )}
              {eyesStyleIndex === 2 && (
                // Smart tech-glasses / HUD glasses
                <g>
                  <rect x="36" y="39" width="28" height="7" rx="1.5" fill={`${activeGradient.from}22`} stroke={activeGradient.from} strokeWidth="1" />
                  <line x1="40" y1="42.5" x2="60" y2="42.5" stroke={activeGradient.from} strokeWidth="1.5" className="opacity-80" />
                  <circle cx="43" cy="42" r="1" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2s' }} />
                  <circle cx="57" cy="42" r="1" fill="#ffffff" />
                </g>
              )}
              {eyesStyleIndex === 3 && (
                // Determined / Bold eyebrows + eyes
                <g fill="#1e293b">
                  {/* Eyebrows */}
                  <path d="M 37 39 Q 43 37, 47 40" stroke="#1e293b" strokeWidth="1.5" fill="none" />
                  <path d="M 63 39 Q 57 37, 53 40" stroke="#1e293b" strokeWidth="1.5" fill="none" />
                  {/* Eyes */}
                  <circle cx="42" cy="44" r="2" />
                  <circle cx="58" cy="44" r="2" />
                  {isAnimated && (
                    <motion.rect 
                      x="38" y="40" width="24" height="6" fill={activeSkin}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: [0, 0, 1, 0, 0] }}
                      transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        repeatType: "loop",
                        times: [0, 0.93, 0.95, 0.97, 1]
                      }}
                      style={{ originY: 0 }}
                    />
                  )}
                </g>
              )}
            </g>

            {/* F. Smile / Expression */}
            <path 
              d="M 44 51 Q 50 56, 56 51" 
              fill="none" 
              stroke="#4a0404" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
            />

            {/* G. Accessory Badge (e.g. Earphones, earring, or glowing tech details) */}
            {accessoryIndex === 1 && (
              // Audio headset / Civic Dispatch Communicator
              <g fill="#475569">
                <rect x="28" y="40" width="4" height="10" rx="1.5" />
                <rect x="68" y="40" width="4" height="10" rx="1.5" />
                <path d="M 30 40 A 20 20 0 0 1 70 40" fill="none" stroke="#334155" strokeWidth="1.5" />
                {/* Glowing LED */}
                <circle cx="70" cy="45" r="1.2" fill={activeGradient.from} className="animate-pulse" />
              </g>
            )}
            {accessoryIndex === 2 && (
              // Tech earring
              <circle cx="31" cy="51" r="2.2" fill={activeGradient.from} stroke="#ffffff" strokeWidth="0.5" className="animate-bounce" style={{ animationDuration: '2s' }} />
            )}
          </g>
        </svg>

        {/* Outer shine layer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 rounded-full pointer-events-none z-20" />
      </motion.div>

      {/* 5. Floating Active Mini-Badge */}
      {isAnimated && (
        <motion.div 
          className={`absolute bottom-[-2px] right-[-2px] z-30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white shadow-md border flex items-center gap-1 ${activeGradient.bg}`}
          style={{ 
            backgroundColor: activeGradient.from,
            borderColor: '#ffffff55'
          }}
          animate={{
            y: [0, -3, 0]
          }}
          transition={{
            duration: 2.2 / speedOffset,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
          {hash % 4 === 0 && "Sentinel"}
          {hash % 4 === 1 && "Guardian"}
          {hash % 4 === 2 && "Civic"}
          {hash % 4 === 3 && "Leader"}
        </motion.div>
      )}
    </div>
  );
}

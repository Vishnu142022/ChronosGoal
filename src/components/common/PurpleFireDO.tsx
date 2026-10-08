import React, { useEffect, useRef, useState } from 'react';

interface PurpleFireDOProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  isHovered?: boolean;
  onClick?: () => void;
  theme?: 'dark' | 'light';
}

export const PurpleFireDO: React.FC<PurpleFireDOProps> = ({ 
  className = '',
  size = 'sm',
  isHovered: externalHovered,
  onClick,
  theme = 'dark'
}) => {
  const [internalHovered, setInternalHovered] = useState<boolean>(false);
  const isHovered = externalHovered ?? internalHovered;

  const stateRef = useRef({
    time: 0,
    intensity: 0,
    targetIntensity: 0
  });

  const [renderState, setRenderState] = useState({
    time: 0,
    intensity: 0
  });

  useEffect(() => {
    stateRef.current.targetIntensity = isHovered ? 1 : 0;
  }, [isHovered]);

  const heightClass = 
    size === 'sm' ? 'h-9' :
    size === 'md' ? 'h-14' :
    size === 'lg' ? 'h-24' : 'h-40';

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = stateRef.current;
      const lerpSpeed = state.targetIntensity > state.intensity ? 6.5 : 4.0;
      state.intensity += (state.targetIntensity - state.intensity) * Math.min(dt * lerpSpeed, 1);

      const speedMultiplier = 1.0 + state.intensity * 1.8;
      const baseFreq = (2 * Math.PI) / 6.0; // Exact 6.0-second seamless loop
      state.time += baseFreq * speedMultiplier * dt;

      setRenderState({
        time: state.time,
        intensity: state.intensity
      });

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const { time: t, intensity } = renderState;

  // Harmonic Wave Oscillations for natural flame movement
  const amp = 1.0 + intensity * 0.45;
  const flickerAmp = 1.0 + intensity * 1.5;

  // D Flame Harmonics
  const dFlankX = (Math.sin(t * 2 + 1.0) * 8 + Math.cos(t * 3) * 3) * amp;
  const dFlankY = (Math.cos(t * 2 + 0.5) * 10 + Math.sin(t * 4) * 3) * amp;

  const dMidX = (Math.sin(t * 3 + 1.8) * 10 + Math.cos(t * 5) * 3) * amp;
  const dMidY = (Math.cos(t * 3 + 1.2) * 12 + Math.sin(t * 4) * 4) * amp;

  const dApexX = (Math.sin(t * 2 + 0.4) * 14 + Math.sin(t * 3 + 1.1) * 5) * amp;
  const dApexY = (Math.cos(t * 3 + 0.2) * 18 + Math.sin(t * 2 + 0.8) * 6) * amp;

  const dRightX = (Math.sin(t * 4 + 2.5) * 7 + Math.cos(t * 6) * 2) * flickerAmp;
  const dRightY = (Math.cos(t * 4 + 1.7) * 9 + Math.sin(t * 5) * 3) * flickerAmp;

  // O Flame Harmonics
  const oLeftX = (Math.sin(t * 2 + 3.0) * 9 + Math.cos(t * 3) * 3) * amp;
  const oLeftY = (Math.cos(t * 2 + 2.2) * 11 + Math.sin(t * 4) * 3) * amp;

  const oMidX = (Math.sin(t * 3 + 4.2) * 11 + Math.cos(t * 5) * 3) * amp;
  const oMidY = (Math.cos(t * 3 + 2.8) * 13 + Math.sin(t * 4) * 4) * amp;

  const oApexX = (Math.sin(t * 2 + 3.8) * 15 + Math.sin(t * 3 + 2.0) * 5) * amp;
  const oApexY = (Math.cos(t * 3 + 1.5) * 20 + Math.sin(t * 2 + 1.1) * 6) * amp;

  const oRightX = (Math.sin(t * 4 + 5.1) * 8 + Math.cos(t * 6) * 3) * flickerAmp;
  const oRightY = (Math.cos(t * 4 + 3.9) * 10 + Math.sin(t * 5) * 3) * flickerAmp;

  // Glow and Sheen
  const glowPulse = (0.88 + Math.sin(t * 4) * 0.12) * (1.0 + intensity * 0.12);
  const coreSheen = Math.min(1.0, (0.85 + Math.sin(t * 4 + 1.2) * 0.15) + intensity * 0.25);

  // -------------------------------------------------------------------------
  // PERFECT "DO" VECTOR TYPOGRAPHY & INTEGRATED PURPLE FIRE ARTWORK
  // -------------------------------------------------------------------------

  // 1. UNIFIED 'D' FLAME SILHOUETTE (Solid Flat Base + Vertical Spine + Counter Hole + Flowing Flames)
  const dExactSilhouette = `
    M 180, 700
    L 420, 700
    C 475, 700 515, 655 515, 580
    C 515, 515 480, 460 455, 430
    
    C ${445 + dRightX * 0.5}, ${395 + dRightY * 0.5} ${470 + dRightX}, ${350 + dRightY} ${460 + dRightX}, ${315 + dRightY}
    C ${445 + dRightX * 0.4}, ${355 + dRightY * 0.5} ${430 + dMidX * 0.6}, ${315 + dMidY * 0.6} ${425 + dMidX * 0.8}, ${275 + dMidY * 0.8}
    
    C ${410 + dMidX * 0.5}, ${330 + dMidY * 0.5} ${398 + dApexX * 0.5}, ${295 + dApexY * 0.5} ${390 + dApexX * 0.4}, ${255 + dApexY * 0.4}
    
    C ${395 + dApexX * 0.7}, ${185 + dApexY * 0.7} ${385 + dApexX * 0.9}, ${135 + dApexY * 0.9} ${375 + dApexX}, ${105 + dApexY}
    C ${365 + dApexX * 0.8}, ${140 + dApexY * 0.8} ${345 + dApexX * 0.6}, ${205 + dApexY * 0.6} ${330 + dApexX * 0.5}, ${240 + dApexY * 0.5}
    
    C ${315 + dMidX * 0.7}, ${180 + dMidY * 0.7} ${300 + dMidX}, ${215 + dMidY} ${285 + dMidX}, ${265 + dMidY}
    
    C ${270 + dFlankX * 0.5}, ${320 + dFlankY * 0.5} ${250 + dFlankX * 0.8}, ${275 + dFlankY * 0.8} ${230 + dFlankX}, ${250 + dFlankY}
    C ${220 + dFlankX * 0.6}, ${300 + dFlankY * 0.6} ${205 + dFlankX * 0.4}, ${365 + dFlankY * 0.5} ${195 + dFlankX * 0.3}, ${415 + dFlankY * 0.4}
    C 185, 465 180, 510 180, 560
    L 180, 700
    Z
    
    M 275, 480
    L 355, 480
    C 405, 480 425, 510 425, 560
    C 425, 610 405, 635 355, 635
    L 275, 635
    Z
  `;

  // 2. INNER LAYER ON 'D' (Bright Electric Violet Flame Ribbons)
  const dElectricLayer = `
    M 215, 435
    C ${205 + dFlankX * 0.5}, ${350 + dFlankY * 0.5} ${225 + dFlankX * 0.8}, ${300 + dFlankY * 0.8} ${240 + dFlankX}, ${270 + dFlankY}
    C ${250 + dFlankX * 0.3}, ${315 + dFlankY * 0.4} ${280 + dMidX * 0.6}, ${245 + dMidY * 0.6} ${300 + dMidX * 0.8}, ${210 + dMidY * 0.8}
    C ${310 + dMidX * 0.4}, ${250 + dMidY * 0.5} ${345 + dApexX * 0.7}, ${170 + dApexY * 0.7} ${370 + dApexX * 0.9}, ${135 + dApexY * 0.9}
    C ${350 + dApexX * 0.5}, ${220 + dApexY * 0.6} ${390 + dRightX * 0.6}, ${285 + dRightY * 0.6} ${415 + dRightX * 0.8}, ${260 + dRightY * 0.8}
    C ${405 + dRightX * 0.3}, ${325 + dRightY * 0.4} 435, 350 445, 420
    C 420, 450 380, 460 340, 460
    C 290, 460 245, 450 215, 435
    Z
  `;

  // 3. INNER CORE ON 'D' (Soft Lavender & White-Hot Flame Highlights)
  const dWhiteCoreHighlight = `
    M 275, 430
    C ${265 + dFlankX * 0.3}, ${375 + dFlankY * 0.3} ${285 + dMidX * 0.5}, ${300 + dMidY * 0.5} ${305 + dMidX * 0.7}, ${245 + dMidY * 0.7}
    C ${315 + dMidX * 0.2}, ${280 + dMidY * 0.3} ${340 + dApexX * 0.5}, ${210 + dApexY * 0.5} ${362 + dApexX * 0.8}, ${168 + dApexY * 0.8}
    C ${348 + dApexX * 0.3}, ${240 + dApexY * 0.4} ${375 + dRightX * 0.5}, ${310 + dRightY * 0.5} ${398 + dRightX * 0.7}, ${285 + dRightY * 0.7}
    C ${380 + dRightX * 0.2}, ${345 + dRightY * 0.3} 400, 375 395, 420
    C 370, 435 330, 440 300, 440
    C 285, 440 278, 435 275, 430
    Z
  `;

  // 4. UNIFIED 'O' FLAME SILHOUETTE (Solid Base Oval + Slanted Geometry + Counter Hole + Flowing Flames)
  const oExactSilhouette = `
    M 670, 700
    C 760, 700 825, 645 825, 575
    C 825, 525 815, 475 798, 430
    
    C ${790 + oRightX * 0.5}, ${385 + oRightY * 0.5} ${805 + oRightX}, ${340 + oRightY} ${795 + oRightX}, ${305 + oRightY}
    C ${780 + oRightX * 0.4}, ${340 + oRightY * 0.5} ${765 + oApexX * 0.5}, ${300 + oApexY * 0.5} ${755 + oApexX * 0.7}, ${255 + oApexY * 0.7}
    
    C ${750 + oApexX * 0.8}, ${185 + oApexY * 0.8} ${735 + oApexX * 0.95}, ${135 + oApexY * 0.95} ${725 + oApexX}, ${100 + oApexY}
    C ${710 + oApexX * 0.7}, ${150 + oApexY * 0.7} ${690 + oApexX * 0.5}, ${210 + oApexY * 0.5} ${675 + oApexX * 0.4}, ${250 + oApexY * 0.4}
    
    C ${660 + oMidX * 0.7}, ${195 + oMidY * 0.7} ${640 + oMidX}, ${230 + oMidY} ${625 + oMidX}, ${280 + oMidY}
    
    C ${605 + oLeftX * 0.6}, ${330 + oLeftY * 0.6} ${580 + oLeftX * 0.9}, ${285 + oLeftY * 0.9} ${560 + oLeftX}, ${260 + oLeftY}
    C ${550 + oLeftX * 0.5}, ${310 + oLeftY * 0.5} ${530 + oLeftX * 0.4}, ${375 + oLeftY * 0.5} ${520 + oLeftX * 0.2}, ${430 + oLeftY * 0.4}
    C 505, 480 500, 525 500, 570
    C 500, 645 570, 700 670, 700
    Z
    
    M 665, 480
    C 620, 480 585, 515 585, 565
    C 585, 620 620, 645 665, 645
    C 710, 645 745, 620 745, 565
    C 745, 515 710, 480 665, 480
    Z
  `;

  // 5. INNER LAYER ON 'O' (Bright Electric Violet Flame Ribbons)
  const oElectricLayer = `
    M 545, 440
    C ${535 + oLeftX * 0.5}, ${360 + oLeftY * 0.5} ${555 + oLeftX * 0.8}, ${305 + oLeftY * 0.8} ${575 + oLeftX}, ${275 + oLeftY}
    C ${585 + oLeftX * 0.3}, ${320 + oLeftY * 0.4} ${615 + oMidX * 0.6}, ${255 + oMidY * 0.6} ${638 + oMidX * 0.8}, ${220 + oMidY * 0.8}
    C ${648 + oMidX * 0.4}, ${260 + oMidY * 0.5} ${685 + oApexX * 0.7}, ${180 + oApexY * 0.7} ${720 + oApexX * 0.95}, ${135 + oApexY * 0.95}
    C ${705 + oApexX * 0.5}, ${230 + oApexY * 0.6} ${735 + oRightX * 0.6}, ${290 + oRightY * 0.6} ${765 + oRightX * 0.8}, ${270 + oRightY * 0.8}
    C ${755 + oRightX * 0.3}, ${330 + oRightY * 0.4} 780, 365 790, 430
    C 755, 455 710, 465 665, 465
    C 620, 465 575, 455 545, 440
    Z
  `;

  // 6. INNER CORE ON 'O' (Soft Lavender & White-Hot Flame Highlights)
  const oWhiteCoreHighlight = `
    M 605, 430
    C ${595 + oLeftX * 0.3}, ${380 + oLeftY * 0.3} ${615 + oMidX * 0.5}, ${310 + oMidY * 0.5} ${638 + oMidX * 0.7}, ${255 + oMidY * 0.7}
    C ${648 + oMidX * 0.2}, ${290 + oMidY * 0.3} ${678 + oApexX * 0.5}, ${220 + oApexY * 0.5} ${708 + oApexX * 0.8}, ${175 + oApexY * 0.8}
    C ${698 + oApexX * 0.3}, ${245 + oApexY * 0.4} ${722 + oRightX * 0.5}, ${315 + oRightY * 0.5} ${748 + oRightX * 0.7}, ${295 + oRightY * 0.7}
    C ${732 + oRightX * 0.2}, ${350 + oRightY * 0.3} 748, 380 738, 425
    C 712, 440 672, 445 640, 445
    C 620, 445 610, 435 605, 430
    Z
  `;

  return (
    <span 
      className={`relative inline-flex items-center justify-center select-none cursor-pointer transition-transform duration-300 active:scale-95 ${isHovered ? 'scale-105' : 'scale-100'} ${className}`}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      title={`Current: ${theme === 'dark' ? 'Dark' : 'Light'} Mode. Click to switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode!`}
      role="button"
      tabIndex={0}
      aria-label={`Toggle theme (currently ${theme} mode)`}
    >
      
      {/* Dynamic Purple Ambient Glow */}
      <span 
        className={`pointer-events-none absolute -inset-4 rounded-full blur-2xl transition-all duration-300 ${
          intensity > 0.4 
            ? 'opacity-90 bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.75)_0%,rgba(147,51,234,0.45)_45%,transparent_75%)] scale-125' 
            : 'opacity-65 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.45)_0%,rgba(147,51,234,0.25)_45%,transparent_75%)]'
        }`}
        style={{ transform: `scale(${1 + Math.sin(t * 4) * 0.05 + intensity * 0.2})` }}
      />

      {/* High-Precision Vector SVG */}
      <svg
        viewBox="140 70 720 660"
        className={`${heightClass} w-auto max-w-full overflow-visible transition-all duration-300 ${
          intensity > 0.4 
            ? 'drop-shadow-[0_0_32px_rgba(217,70,239,0.9)] filter saturate-150' 
            : 'drop-shadow-[0_6px_24px_rgba(147,51,234,0.65)]'
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Rich Dark Violet / Indigo to Electric Purple Base Gradient */}
          <linearGradient id="imageMainFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={intensity > 0.4 ? "#2e0052" : "#16002c"} />
            <stop offset="35%" stopColor={intensity > 0.4 ? "#4a047d" : "#300254"} />
            <stop offset="65%" stopColor={intensity > 0.4 ? "#7a12b8" : "#5b0a99"} />
            <stop offset="85%" stopColor={intensity > 0.4 ? "#941cd6" : "#7c14c2"} />
            <stop offset="100%" stopColor={intensity > 0.4 ? "#c026d3" : "#941cd6"} />
          </linearGradient>

          {/* Electric Purple / Magenta Mid-Flame Ribbon Gradient */}
          <linearGradient id="imageElectricRibbonGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#5b0a99" stopOpacity="0.2" />
            <stop offset="35%" stopColor="#7c14c2" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#a82de3" stopOpacity="0.95" />
            <stop offset="100%" stopColor={intensity > 0.4 ? "#f0abfc" : "#cb6ce6"} stopOpacity="1" />
          </linearGradient>

          {/* Radiant Lavender to Pure White Hot Core Highlight Gradient */}
          <linearGradient id="imageWhiteCoreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7c14c2" stopOpacity="0" />
            <stop offset="30%" stopColor="#a82de3" stopOpacity="0.6" />
            <stop offset="65%" stopColor="#e9a3fc" stopOpacity="0.9" />
            <stop offset="88%" stopColor="#f5d0fe" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          {/* Luminous Inner Vector Highlight Stroke */}
          <linearGradient id="imageStrokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#f5d0fe" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#cb6ce6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c14c2" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ----------------- LAYER 1: BASE UNIFIED SILHOUETTES ('D' & 'O') ----------------- */}
        <g id="artwork-main-silhouettes">
          {/* Main D Letter + Flame */}
          <path
            fillRule="evenodd"
            d={dExactSilhouette}
            fill="url(#imageMainFlameGrad)"
            opacity={glowPulse}
          />

          {/* Main O Letter + Flame */}
          <path
            fillRule="evenodd"
            d={oExactSilhouette}
            fill="url(#imageMainFlameGrad)"
            opacity={glowPulse}
          />
        </g>

        {/* ----------------- LAYER 2: ELECTRIC PURPLE MID-FLAME RIBBONS ----------------- */}
        <g id="artwork-electric-ribbons">
          {/* Mid Flame Layer on D */}
          <path
            d={dElectricLayer}
            fill="url(#imageElectricRibbonGrad)"
            opacity="0.9"
          />

          {/* Mid Flame Layer on O */}
          <path
            d={oElectricLayer}
            fill="url(#imageElectricRibbonGrad)"
            opacity="0.9"
          />
        </g>

        {/* ----------------- LAYER 3: RADIANT WHITE/LAVENDER INNER CORE HIGHLIGHTS ----------------- */}
        <g id="artwork-white-core-highlights">
          {/* White Core on D */}
          <path
            d={dWhiteCoreHighlight}
            fill="url(#imageWhiteCoreGrad)"
            opacity={coreSheen}
          />

          {/* White Core on O */}
          <path
            d={oWhiteCoreHighlight}
            fill="url(#imageWhiteCoreGrad)"
            opacity={coreSheen}
          />
        </g>

        {/* ----------------- LAYER 4: STYLIZED LUMINOUS S-CURVE VECTOR ACCENTS ----------------- */}
        <g id="artwork-luminous-strokes" stroke="url(#imageStrokeGrad)" strokeWidth={intensity > 0.4 ? "3.5" : "2.8"} strokeLinecap="round">
          {/* D Apex Curve Highlight */}
          <path
            d={`M ${370 + dApexX}, ${115 + dApexY} Q ${350 + dApexX * 0.7}, ${185 + dApexY * 0.7} ${320 + dMidX * 0.7}, ${260 + dMidY * 0.7}`}
            opacity="0.9"
          />

          {/* D Left Flank Accent */}
          <path
            d={`M ${230 + dFlankX}, ${260 + dFlankY} Q ${215 + dFlankX * 0.7}, ${330 + dFlankY * 0.7} 195, 420`}
            opacity="0.8"
          />

          {/* O Apex Curve Highlight */}
          <path
            d={`M ${720 + oApexX}, ${110 + oApexY} Q ${695 + oApexX * 0.7}, ${190 + oApexY * 0.7} ${650 + oMidX * 0.7}, ${270 + oMidY * 0.7}`}
            opacity="0.9"
          />

          {/* O Left Shoulder Accent */}
          <path
            d={`M ${560 + oLeftX}, ${270 + oLeftY} Q ${545 + oLeftX * 0.7}, ${335 + oLeftY * 0.7} 530, 420`}
            opacity="0.8"
          />
        </g>

        {/* ----------------- HIGH-CONTRAST SPECULAR RIM ON BASE OF LETTERS ----------------- */}
        <path
          d="M 180, 700 L 420, 700 C 475, 700 515, 655 515, 580"
          stroke={intensity > 0.4 ? "#f0abfc" : "#a82de3"}
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 520, 620 C 550, 675 605, 700 670, 700 C 735, 700 790, 675 815, 620"
          stroke={intensity > 0.4 ? "#f0abfc" : "#a82de3"}
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        />

      </svg>

    </span>
  );
};


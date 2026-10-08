import React, { useState } from 'react';
import purpleBoltImg from '../../assets/images/purple_bolt_logo_1790598617737.jpg';

interface PurpleLightningLogoProps {
  className?: string;
  size?: number | string;
}

export const PurpleLightningLogo: React.FC<PurpleLightningLogoProps> = ({ 
  className = "w-full h-full", 
  size 
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const dimensionStyle = size ? { width: size, height: size } : undefined;

  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center bg-[#050209] overflow-hidden ${className}`}
      style={dimensionStyle}
    >
      {!imgFailed ? (
        <img
          src={purpleBoltImg}
          alt="Discipline OS Logo"
          className="w-full h-full object-cover select-none"
          onError={() => setImgFailed(true)}
        />
      ) : (
        /* Vector SVG Fallback with Dual Interlocking Neon Lightning Blades */
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1 drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]"
        >
          <defs>
            <linearGradient id="neonBoltGrad" x1="25%" y1="15%" x2="75%" y2="85%">
              <stop offset="0%" stopColor="#F5F3FF" />
              <stop offset="25%" stopColor="#C084FC" />
              <stop offset="65%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <filter id="neonBoltGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Top Sharp Lightning Blade */}
          <path
            d="M 56.5 14.5 L 43.8 34.5 L 43.8 46.5 L 33 68.5 L 55.2 44.5 L 59.5 41.5 Z"
            fill="url(#neonBoltGrad)"
            filter="url(#neonBoltGlow)"
          />

          {/* Bottom Sharp Lightning Blade */}
          <path
            d="M 75.5 33 L 44.2 55.5 L 40.5 58.5 L 51.8 57 L 53.5 83.5 L 67 48 Z"
            fill="url(#neonBoltGrad)"
            filter="url(#neonBoltGlow)"
          />
        </svg>
      )}

      {/* Subtle Neon Edge Rim */}
      <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-[#A855F7]/40" />
    </div>
  );
};


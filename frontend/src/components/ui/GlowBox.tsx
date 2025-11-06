import React from 'react';
import { Box, styled, keyframes } from '@mui/material';
import type { BoxProps as MuiBoxProps } from '@mui/material/Box';

// Keyframe animations
const borderGlowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px currentColor,
                0 0 20px currentColor,
                inset 0 0 10px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor,
                0 0 40px currentColor,
                inset 0 0 20px currentColor;
  }
`;

const backgroundPulse = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
`;

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

// Styled components
interface GlowBoxStyledProps {
  glowColor?: string;
  glowIntensity?: 'low' | 'medium' | 'high';
  glowEffect?: 'pulse' | 'border' | 'background' | 'floating' | 'rotating';
  borderGlow?: boolean;
}

const GlowBoxStyled = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'glowColor' &&
    prop !== 'glowIntensity' &&
    prop !== 'glowEffect' &&
    prop !== 'borderGlow',
})<GlowBoxStyledProps>(
  ({ theme, glowColor = '#3b82f6', glowIntensity = 'medium', glowEffect = 'pulse', borderGlow = true }) => {
    // Intensity settings
    const intensities = {
      low: { blur: 15, spread: 5, opacity: 0.4 },
      medium: { blur: 30, spread: 10, opacity: 0.6 },
      high: { blur: 50, spread: 20, opacity: 0.8 },
    };

    const intensity = intensities[glowIntensity];

    // Base styles
    const baseStyles = {
      position: 'relative' as const,
      borderRadius: theme.spacing(2),
      padding: theme.spacing(3),
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
      backdropFilter: 'blur(10px)',
      border: `2px solid ${glowColor}44`,
      transition: 'all 0.3s ease-in-out',
      overflow: 'hidden',

      '&::before': borderGlow
        ? {
            content: '""',
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: theme.spacing(2),
            padding: '2px',
            background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: 0.6,
            zIndex: -1,
          }
        : {},

      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: glowColor,
        boxShadow: `0 0 ${intensity.blur}px ${glowColor}${Math.round(intensity.opacity * 255).toString(16)}`,
      },
    };

    // Effect-specific styles
    const effects = {
      pulse: {
        color: glowColor,
        animation: `${borderGlowPulse} 3s ease-in-out infinite`,
      },

      border: {
        '&::before': {
          animation: `${rotate360} 4s linear infinite`,
        },
      },

      background: {
        '&::after': {
          content: '""',
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150%',
          height: '150%',
          background: `radial-gradient(circle, ${glowColor}44 0%, transparent 70%)`,
          animation: `${backgroundPulse} 3s ease-in-out infinite`,
          zIndex: -1,
          pointerEvents: 'none' as const,
        },
      },

      floating: {
        animation: `${floatAnimation} 3s ease-in-out infinite`,
        boxShadow: `0 10px ${intensity.blur}px ${glowColor}${Math.round(intensity.opacity * 255).toString(16)}`,
      },

      rotating: {
        '&::before': {
          background: `conic-gradient(from 0deg, ${glowColor}, transparent, ${glowColor}, transparent, ${glowColor})`,
          animation: `${rotate360} 3s linear infinite`,
        },
      },
    };

    return {
      ...baseStyles,
      ...effects[glowEffect],
    };
  }
);

// Component props
export interface GlowBoxProps extends Omit<MuiBoxProps, 'color'> {
  glowColor?: string;
  glowIntensity?: 'low' | 'medium' | 'high';
  glowEffect?: 'pulse' | 'border' | 'background' | 'floating' | 'rotating';
  borderGlow?: boolean;
  children: React.ReactNode;
}

export const GlowBox: React.FC<GlowBoxProps> = ({
  glowColor = '#3b82f6',
  glowIntensity = 'medium',
  glowEffect = 'pulse',
  borderGlow = true,
  children,
  ...boxProps
}) => {
  return (
    <GlowBoxStyled
      glowColor={glowColor}
      glowIntensity={glowIntensity}
      glowEffect={glowEffect}
      borderGlow={borderGlow}
      {...boxProps}
    >
      {children}
    </GlowBoxStyled>
  );
};

export default GlowBox;

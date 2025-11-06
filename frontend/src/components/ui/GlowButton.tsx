import React from 'react';
import { Button, styled, keyframes } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button';

// Keyframe animations
const shimmer = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
`;

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px currentColor;
  }
  50% {
    box-shadow: 0 0 40px currentColor, 0 0 60px currentColor;
  }
`;

const borderRotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Styled button variants
interface GlowButtonStyledProps {
  glowColor?: string;
  glowVariant?: 'solid' | 'outline' | 'gradient' | 'neon';
}

const GlowButtonBase = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'glowColor' && prop !== 'glowVariant',
})<GlowButtonStyledProps>(({ theme, glowColor = '#3b82f6', glowVariant = 'solid' }) => {
  const baseStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    fontWeight: 600,
    fontSize: '1rem',
    textTransform: 'none' as const,
    borderRadius: theme.spacing(2),
    padding: theme.spacing(1.5, 4),
    transition: 'all 0.3s ease-in-out',
    zIndex: 1,

    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      transform: 'rotate(45deg)',
      transition: 'all 0.6s ease-in-out',
      zIndex: -1,
    },

    '&:hover::before': {
      animation: `${shimmer} 1s ease-in-out`,
    },

    '&:active': {
      transform: 'translateY(2px)',
    },
  };

  // Variant-specific styles
  const variants = {
    solid: {
      background: `linear-gradient(135deg, ${glowColor} 0%, ${adjustColor(glowColor, -20)} 100%)`,
      color: 'white',
      border: `2px solid ${adjustColor(glowColor, 20)}`,
      boxShadow: `0 0 20px ${glowColor}66`,

      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 0 30px ${glowColor}99, 0 10px 40px rgba(0, 0, 0, 0.3)`,
        animation: `${pulse} 2s ease-in-out infinite`,
      },
    },

    outline: {
      background: 'transparent',
      color: glowColor,
      border: `2px solid ${glowColor}`,
      boxShadow: `inset 0 0 20px ${glowColor}33`,

      '&:hover': {
        background: `${glowColor}22`,
        transform: 'translateY(-3px)',
        boxShadow: `0 0 30px ${glowColor}99, inset 0 0 30px ${glowColor}44`,
      },
    },

    gradient: {
      background: `linear-gradient(135deg, ${glowColor} 0%, ${adjustColor(glowColor, -40)} 50%, ${adjustColor(glowColor, 40)} 100%)`,
      backgroundSize: '200% 200%',
      color: 'white',
      border: `2px solid ${adjustColor(glowColor, 30)}`,
      animation: 'gradient 3s ease infinite',

      '@keyframes gradient': {
        '0%, 100%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
      },

      '&:hover': {
        transform: 'translateY(-3px) scale(1.05)',
        boxShadow: `0 0 40px ${glowColor}99, 0 15px 50px rgba(0, 0, 0, 0.4)`,
      },
    },

    neon: {
      background: 'rgba(0, 0, 0, 0.8)',
      color: glowColor,
      border: `2px solid ${glowColor}`,
      boxShadow: `0 0 10px ${glowColor}, inset 0 0 10px ${glowColor}33`,
      textShadow: `0 0 10px ${glowColor}`,

      '&::after': {
        content: '""',
        position: 'absolute' as const,
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        background: `linear-gradient(45deg, ${glowColor}, transparent, ${glowColor})`,
        borderRadius: theme.spacing(2),
        opacity: 0,
        zIndex: -1,
        animation: `${borderRotate} 3s linear infinite`,
      },

      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}66, inset 0 0 20px ${glowColor}44`,
        textShadow: `0 0 20px ${glowColor}`,

        '&::after': {
          opacity: 1,
        },
      },
    },
  };

  return {
    ...baseStyles,
    ...variants[glowVariant],
  };
});

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Component props
export interface GlowButtonProps extends Omit<MuiButtonProps, 'variant'> {
  glowColor?: string;
  glowVariant?: 'solid' | 'outline' | 'gradient' | 'neon';
  children: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  glowColor = '#3b82f6',
  glowVariant = 'solid',
  children,
  ...buttonProps
}) => {
  return (
    <GlowButtonBase
      glowColor={glowColor}
      glowVariant={glowVariant}
      {...buttonProps}
    >
      {children}
    </GlowButtonBase>
  );
};

export default GlowButton;

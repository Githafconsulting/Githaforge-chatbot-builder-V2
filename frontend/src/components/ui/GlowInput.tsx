import React from 'react';
import { TextField, styled, keyframes } from '@mui/material';
import type { TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

// Keyframe animations
const focusGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px currentColor, inset 0 0 5px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, inset 0 0 10px currentColor;
  }
`;

const borderShine = keyframes`
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
`;

// Styled TextField
interface GlowInputStyledProps {
  glowColor?: string;
}

const GlowInputStyled = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'glowColor',
})<GlowInputStyledProps>(({ theme, glowColor = '#3b82f6' }) => ({
  '& .MuiOutlinedInput-root': {
    position: 'relative',
    overflow: 'hidden',
    color: 'white',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderRadius: theme.spacing(1.5),
    transition: 'all 0.3s ease-in-out',

    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: `linear-gradient(90deg, transparent, ${glowColor}44, transparent)`,
      transition: 'left 0.6s ease-in-out',
    },

    '& fieldset': {
      borderColor: `${glowColor}66`,
      borderWidth: '2px',
      transition: 'all 0.3s ease-in-out',
    },

    '&:hover': {
      backgroundColor: 'rgba(31, 41, 55, 0.9)',

      '& fieldset': {
        borderColor: glowColor,
      },

      '&::before': {
        left: '100%',
      },
    },

    '&.Mui-focused': {
      animation: `${focusGlow} 2s ease-in-out infinite`,
      color: glowColor,
      boxShadow: `0 0 20px ${glowColor}66`,

      '& fieldset': {
        borderColor: `${glowColor} !important`,
        borderWidth: '2px !important',
        boxShadow: `0 0 10px ${glowColor}44, inset 0 0 10px ${glowColor}22`,
      },
    },

    '&.Mui-error': {
      '& fieldset': {
        borderColor: '#ef4444 !important',
      },

      '&.Mui-focused': {
        color: '#ef4444',
        animation: 'none',
        boxShadow: '0 0 20px #ef444466',
      },
    },
  },

  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 500,

    '&.Mui-focused': {
      color: glowColor,
      fontWeight: 600,
    },

    '&.Mui-error': {
      color: '#ef4444',
    },
  },

  '& .MuiFormHelperText-root': {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    marginLeft: theme.spacing(1),

    '&.Mui-error': {
      color: '#ef4444',
    },
  },

  '& .MuiInputBase-input': {
    color: 'white',
    padding: theme.spacing(1.5, 2),

    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.4)',
      opacity: 1,
    },

    '&:-webkit-autofill': {
      WebkitBoxShadow: `0 0 0 100px rgba(17, 24, 39, 0.9) inset`,
      WebkitTextFillColor: 'white',
      caretColor: 'white',
    },
  },
}));

// Component props
export interface GlowInputProps extends Omit<MuiTextFieldProps, 'variant'> {
  glowColor?: string;
}

export const GlowInput: React.FC<GlowInputProps> = ({
  glowColor = '#3b82f6',
  ...textFieldProps
}) => {
  return (
    <GlowInputStyled
      variant="outlined"
      glowColor={glowColor}
      {...textFieldProps}
    />
  );
};

export default GlowInput;

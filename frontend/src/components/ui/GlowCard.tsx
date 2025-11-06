import React from 'react';
import { Box, Card, CardContent, CardMedia, Typography, styled, keyframes } from '@mui/material';

// Keyframe animations for glow effects
const glowPulse = keyframes`
  0%, 100% {
    opacity: 0.5;
    filter: blur(20px);
  }
  50% {
    opacity: 1;
    filter: blur(30px);
  }
`;

const borderGlow = keyframes`
  0% {
    box-shadow: 0 0 5px currentColor,
                0 0 10px currentColor,
                0 0 20px currentColor;
  }
  50% {
    box-shadow: 0 0 10px currentColor,
                0 0 20px currentColor,
                0 0 40px currentColor;
  }
  100% {
    box-shadow: 0 0 5px currentColor,
                0 0 10px currentColor,
                0 0 20px currentColor;
  }
`;

const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Styled components
interface GlowCardContainerProps {
  glowColor?: string;
}

const GlowCardContainer = styled(Box)<GlowCardContainerProps>(({ theme, glowColor = '#3b82f6' }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: 350,
  margin: theme.spacing(2),
  perspective: '1000px',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    background: `linear-gradient(45deg, ${glowColor}, transparent, ${glowColor})`,
    borderRadius: theme.spacing(2),
    opacity: 0.6,
    animation: `${rotate} 3s linear infinite`,
    zIndex: -1,
  },

  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '150%',
    height: '150%',
    background: `radial-gradient(circle, ${glowColor}33 0%, transparent 70%)`,
    animation: `${glowPulse} 3s ease-in-out infinite`,
    zIndex: -2,
    pointerEvents: 'none',
  },

  '&:hover': {
    transform: 'translateY(-8px)',
    transition: 'transform 0.3s ease-in-out',

    '&::before': {
      opacity: 1,
    },

    '& .glow-card-inner': {
      borderColor: glowColor,
      boxShadow: `0 0 20px ${glowColor}88, 0 10px 40px rgba(0, 0, 0, 0.3)`,
    },
  },

  transition: 'transform 0.3s ease-in-out',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  border: '2px solid rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  transition: 'all 0.3s ease-in-out',
  height: '100%',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
  },
}));

const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  paddingTop: '75%', // 4:3 aspect ratio

  '& img': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease-in-out',
  },

  '&:hover img': {
    transform: 'scale(1.1)',
  },

  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)',
    pointerEvents: 'none',
  },
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(3),
  background: 'rgba(0, 0, 0, 0.2)',
  position: 'relative',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '80%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
  },
}));

// Component props
export interface GlowCardProps {
  image: string;
  title: string;
  subtitle?: string;
  description?: string;
  glowColor?: string;
  onClick?: () => void;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  image,
  title,
  subtitle,
  description,
  glowColor = '#3b82f6',
  onClick,
}) => {
  return (
    <GlowCardContainer glowColor={glowColor}>
      <StyledCard className="glow-card-inner" onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default' }}>
        <ImageContainer>
          <img src={image} alt={title} />
        </ImageContainer>

        <StyledCardContent>
          <Typography
            variant="h5"
            component="h3"
            sx={{
              color: 'white',
              fontWeight: 700,
              mb: subtitle ? 0.5 : 1,
              textAlign: 'center',
              textShadow: `0 0 10px ${glowColor}66`,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="subtitle2"
              sx={{
                color: glowColor,
                textAlign: 'center',
                mb: description ? 1.5 : 0,
                fontWeight: 500,
                letterSpacing: '0.5px',
              }}
            >
              {subtitle}
            </Typography>
          )}

          {description && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              {description}
            </Typography>
          )}
        </StyledCardContent>
      </StyledCard>
    </GlowCardContainer>
  );
};

export default GlowCard;

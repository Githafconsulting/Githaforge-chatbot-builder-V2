import React, { useState } from 'react';
import { Box, Container, Typography, Grid, Paper, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { GlowCard } from '../components/ui/GlowCard';
import { GlowButton } from '../components/ui/GlowButton';
import { GlowBox } from '../components/ui/GlowBox';
import { GlowInput } from '../components/ui/GlowInput';
import { Sparkles, Zap, Star, Heart, Rocket, Flame } from 'lucide-react';

const PageContainer = Box as any;
const SectionBox = Box as any;

export const GlowComponentsShowcase: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [email, setEmail] = useState('');

  return (
    <PageContainer
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #0f172a 50%, #1e1b4b 75%, #0f172a 100%)',
        py: 8,
      }}
    >
      <Container maxWidth="xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              fontWeight: 900,
              mb: 2,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 33%, #ec4899 66%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            ✨ Glow Components Showcase
          </Typography>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 6,
              fontWeight: 400,
            }}
          >
            Beautiful Material-UI components with stunning glow effects
          </Typography>
        </motion.div>

        {/* GlowButton Section */}
        <SectionBox sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Zap size={32} color="#3b82f6" />
              GlowButton Variants
            </Typography>

            <Grid container spacing={3}>
              {/* Solid Buttons */}
              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#3b82f6" glowEffect="border" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Solid Variant
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <GlowButton glowColor="#3b82f6" glowVariant="solid">
                      Blue Solid
                    </GlowButton>
                    <GlowButton glowColor="#10b981" glowVariant="solid">
                      Green Solid
                    </GlowButton>
                    <GlowButton glowColor="#a855f7" glowVariant="solid">
                      Purple Solid
                    </GlowButton>
                  </Box>
                </GlowBox>
              </Grid>

              {/* Outline Buttons */}
              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#10b981" glowEffect="pulse" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Outline Variant
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <GlowButton glowColor="#ec4899" glowVariant="outline">
                      Pink Outline
                    </GlowButton>
                    <GlowButton glowColor="#f59e0b" glowVariant="outline">
                      Orange Outline
                    </GlowButton>
                    <GlowButton glowColor="#06b6d4" glowVariant="outline">
                      Cyan Outline
                    </GlowButton>
                  </Box>
                </GlowBox>
              </Grid>

              {/* Gradient Buttons */}
              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#a855f7" glowEffect="background" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Gradient Variant
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <GlowButton glowColor="#3b82f6" glowVariant="gradient">
                      Gradient Blue
                    </GlowButton>
                    <GlowButton glowColor="#22c55e" glowVariant="gradient">
                      Gradient Green
                    </GlowButton>
                  </Box>
                </GlowBox>
              </Grid>

              {/* Neon Buttons */}
              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#ec4899" glowEffect="rotating" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Neon Variant
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <GlowButton glowColor="#ec4899" glowVariant="neon">
                      Neon Pink
                    </GlowButton>
                    <GlowButton glowColor="#8b5cf6" glowVariant="neon">
                      Neon Purple
                    </GlowButton>
                  </Box>
                </GlowBox>
              </Grid>
            </Grid>
          </motion.div>
        </SectionBox>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 6 }} />

        {/* GlowBox Section */}
        <SectionBox sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star size={32} color="#f59e0b" />
              GlowBox Effects
            </Typography>

            <Grid container spacing={3}>
              {/* Pulse Effect */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#3b82f6" glowEffect="pulse" glowIntensity="high">
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Pulse Effect
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Pulsing border glow animation with high intensity
                  </Typography>
                </GlowBox>
              </Grid>

              {/* Border Effect */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#10b981" glowEffect="border" glowIntensity="medium">
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Border Effect
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Rotating gradient border animation
                  </Typography>
                </GlowBox>
              </Grid>

              {/* Background Effect */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#a855f7" glowEffect="background" glowIntensity="medium">
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Background Effect
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Pulsing radial gradient background
                  </Typography>
                </GlowBox>
              </Grid>

              {/* Floating Effect */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#ec4899" glowEffect="floating" glowIntensity="low">
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Floating Effect
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Smooth up and down floating animation
                  </Typography>
                </GlowBox>
              </Grid>

              {/* Rotating Effect */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#f59e0b" glowEffect="rotating" glowIntensity="high">
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Rotating Effect
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Conic gradient rotating border
                  </Typography>
                </GlowBox>
              </Grid>

              {/* No Border Glow */}
              <Grid item xs={12} md={4}>
                <GlowBox glowColor="#06b6d4" glowEffect="pulse" borderGlow={false}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    No Border Glow
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Clean look without border animation
                  </Typography>
                </GlowBox>
              </Grid>
            </Grid>
          </motion.div>
        </SectionBox>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 6 }} />

        {/* GlowInput Section */}
        <SectionBox sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles size={32} color="#ec4899" />
              GlowInput Fields
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#3b82f6" glowEffect="border" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Blue Glow Input
                  </Typography>
                  <GlowInput
                    fullWidth
                    label="Your Name"
                    placeholder="Enter your name"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    glowColor="#3b82f6"
                    helperText="This input glows blue when focused"
                  />
                </GlowBox>
              </Grid>

              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#10b981" glowEffect="pulse" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Green Glow Input
                  </Typography>
                  <GlowInput
                    fullWidth
                    label="Email Address"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    glowColor="#10b981"
                    helperText="This input glows green when focused"
                  />
                </GlowBox>
              </Grid>

              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#a855f7" glowEffect="background" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Purple Multiline
                  </Typography>
                  <GlowInput
                    fullWidth
                    multiline
                    rows={4}
                    label="Your Message"
                    placeholder="Type your message here..."
                    glowColor="#a855f7"
                    helperText="Multiline input with purple glow"
                  />
                </GlowBox>
              </Grid>

              <Grid item xs={12} md={6}>
                <GlowBox glowColor="#ec4899" glowEffect="floating" sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
                    Pink Error State
                  </Typography>
                  <GlowInput
                    fullWidth
                    label="Password"
                    type="password"
                    error
                    helperText="Password must be at least 8 characters"
                    glowColor="#ec4899"
                  />
                </GlowBox>
              </Grid>
            </Grid>
          </motion.div>
        </SectionBox>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 6 }} />

        {/* GlowCard Section */}
        <SectionBox sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Heart size={32} color="#a855f7" />
              GlowCard Gallery
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <GlowCard
                  image="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=500"
                  title="Ocean Waves"
                  subtitle="Nature's Beauty"
                  description="Experience the calming effect of ocean waves"
                  glowColor="#06b6d4"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <GlowCard
                  image="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500"
                  title="Mountain Peak"
                  subtitle="Adventure Awaits"
                  description="Reach new heights with breathtaking views"
                  glowColor="#10b981"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <GlowCard
                  image="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500"
                  title="Aurora Sky"
                  subtitle="Natural Wonder"
                  description="Witness the magic of northern lights"
                  glowColor="#a855f7"
                />
              </Grid>
            </Grid>
          </motion.div>
        </SectionBox>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <GlowBox
            glowColor="#8b5cf6"
            glowEffect="rotating"
            glowIntensity="high"
            sx={{
              p: 6,
              textAlign: 'center',
            }}
          >
            <Rocket size={48} color="#8b5cf6" style={{ margin: '0 auto 16px' }} />
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
              Ready to Add Some Glow?
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 4 }}>
              Use these components in your project and make it shine!
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <GlowButton glowColor="#3b82f6" glowVariant="gradient" size="large">
                Get Started
              </GlowButton>
              <GlowButton glowColor="#ec4899" glowVariant="neon" size="large">
                View Docs
              </GlowButton>
            </Box>
          </GlowBox>
        </motion.div>
      </Container>
    </PageContainer>
  );
};

export default GlowComponentsShowcase;

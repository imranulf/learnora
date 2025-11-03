import { Error as ErrorIcon, MenuBook as MenuBookIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import DarkModeToggle from '../../common/components/DarkModeToggle';
import { useSession } from '../../hooks/useSession';
import { signInWithCredentials } from '../../services/auth';

export default function SignInForm() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithCredentials(email, password);

      if (result.success && result.session) {
        setSession(result.session);
        navigate(callbackUrl, { replace: true });
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #5e35b1 50%, #7b1fa2 100%)',
        px: 2,
        py: 6,
      }}
    >
      {/* Dark Mode Toggle - Top Right */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
        <DarkModeToggle />
      </Box>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={24} sx={{ borderRadius: 4, p: 4 }}>
            {/* Logo and Title */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    background: 'linear-gradient(135deg, #1976d2 0%, #5e35b1 100%)',
                    borderRadius: 4,
                    mb: 2,
                    boxShadow: 4,
                  }}
                >
                  <MenuBookIcon sx={{ fontSize: 48, color: 'white' }} />
                </Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Welcome Back
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Sign in to continue your learning journey
                </Typography>
              </Box>
            </motion.div>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}

              <TextField
                type="email"
                id="email"
                name="email"
                label="Email Address"
                placeholder="you@example.com"
                required
                autoFocus
                fullWidth
                margin="normal"
                disabled={loading}
              />

              <TextField
                type="password"
                id="password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                required
                fullWidth
                margin="normal"
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #1976d2 0%, #5e35b1 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #4527a0 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                  },
                  transition: 'all 0.3s',
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    <span>Signing in...</span>
                  </Box>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>

            {/* Sign Up Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link to="/sign-up" style={{ textDecoration: 'none' }}>
                    <Typography
                      component="span"
                      variant="body2"
                      color="primary"
                      fontWeight="bold"
                      sx={{
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Sign up here
                    </Typography>
                  </Link>
                </Typography>
              </Box>
            </motion.div>
          </Paper>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Typography
              variant="body2"
              sx={{
                mt: 4,
                textAlign: 'center',
                color: 'white',
                opacity: 0.9,
              }}
            >
              © 2025 Learnora. All rights reserved.
            </Typography>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
}

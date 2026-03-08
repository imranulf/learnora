/**
 * FloatingChat - A floating chat button + slide-up panel that appears on all pages.
 *
 * Features:
 * - Floating action button (FAB) in the bottom-right corner
 * - Expands into a chat panel with mode selection (LPP / Basic)
 * - Persists thread via ChatContext across pages
 * - Auto-navigates to learning path viewer when a path is created
 */
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Fab,
  IconButton,
  Paper,
  Slide,
  Stack,
  Typography,
  Zoom,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { ConnectedChatWindow } from './ConnectedChatWindow';
import { AgentMode } from './types';
import { useChatContext } from '../../hooks/useChatContext';

export function FloatingChat() {
  const navigate = useNavigate();
  const { activeThreadId, clearActiveThread } = useChatContext();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AgentMode | undefined>(undefined);
  const [chatStarted, setChatStarted] = useState(false);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleStartLPP = () => {
    clearActiveThread();
    setMode(AgentMode.LPP);
    setChatStarted(true);
  };

  const handleStartBasic = () => {
    clearActiveThread();
    setMode(AgentMode.BASIC);
    setChatStarted(true);
  };

  const handleNewChat = () => {
    clearActiveThread();
    setChatStarted(false);
    setMode(undefined);
  };

  const handleLearningPathCreated = (threadId: string) => {
    setTimeout(() => {
      navigate(`/learning-path?thread=${threadId}`);
    }, 2000);
  };

  return (
    <>
      {/* Chat Panel */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 420 },
            height: { xs: 'calc(100vh - 200px)', sm: 560 },
            maxHeight: 'calc(100vh - 140px)',
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1300,
          }}
        >
          {/* Panel Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {chatStarted
                ? mode === AgentMode.LPP
                  ? 'Create Learning Path'
                  : 'AI Chat'
                : 'Learnora AI'}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {chatStarted && (
                <IconButton
                  size="small"
                  onClick={handleNewChat}
                  sx={{ color: 'white' }}
                  title="New Chat"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={handleToggle}
                sx={{ color: 'white' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Panel Body */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!chatStarted ? (
              /* Mode Selection */
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1 }}>
                  How can I help you today?
                </Typography>

                <Button
                  variant="outlined"
                  onClick={handleStartLPP}
                  startIcon={<AutoStoriesIcon />}
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight={600}>
                      Create Learning Path
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Guided conversation to build your personalized path
                    </Typography>
                  </Box>
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleStartBasic}
                  startIcon={<QuestionAnswerIcon />}
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    py: 1.5,
                    px: 2,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight={600}>
                      Ask a Question
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Get explanations and learning guidance
                    </Typography>
                  </Box>
                </Button>

                {activeThreadId && (
                  <Button
                    variant="text"
                    onClick={() => setChatStarted(true)}
                    size="small"
                    sx={{ textTransform: 'none', mt: 1 }}
                  >
                    Resume previous conversation
                  </Button>
                )}
              </Box>
            ) : (
              /* Chat Window */
              <Box sx={{ flexGrow: 1, p: 1, minHeight: 0 }}>
                <ConnectedChatWindow
                  agentTitle="Learnora AI"
                  mode={mode}
                  onLearningPathCreated={handleLearningPathCreated}
                />
              </Box>
            )}
          </Box>
        </Paper>
      </Slide>

      {/* Floating Action Button — Gemini-style animated icon */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          onClick={handleToggle}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
            overflow: 'visible',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)',
              boxShadow: '0 6px 28px rgba(102, 126, 234, 0.6)',
            },
          }}
        >
          {/* Outer glow pulse ring */}
          <Box
            component={motion.div}
            animate={{
              scale: [1, 1.6, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            sx={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.4)',
              pointerEvents: 'none',
            }}
          />
          {/* Gemini sparkle SVG */}
          <Box
            component={motion.div}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            sx={{ position: 'absolute', width: 36, height: 36 }}
          >
            {/* 4-point star sparkle — large */}
            <Box
              component={motion.svg}
              viewBox="0 0 28 28"
              animate={{ scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <path
                d="M14 0 C14 7.7 20.3 14 28 14 C20.3 14 14 20.3 14 28 C14 20.3 7.7 14 0 14 C7.7 14 14 7.7 14 0Z"
                fill="white"
              />
            </Box>
          </Box>
          {/* Secondary sparkle — smaller, offset */}
          <Box
            component={motion.div}
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            sx={{ position: 'absolute', width: 14, height: 14, top: 6, right: 6 }}
          >
            <Box
              component={motion.svg}
              viewBox="0 0 28 28"
              animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              sx={{ width: '100%', height: '100%' }}
            >
              <path
                d="M14 0 C14 7.7 20.3 14 28 14 C20.3 14 14 20.3 14 28 C14 20.3 7.7 14 0 14 C7.7 14 14 7.7 14 0Z"
                fill="rgba(255,255,255,0.8)"
              />
            </Box>
          </Box>
        </Fab>
      </Zoom>
    </>
  );
}

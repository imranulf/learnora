import {
  Assessment,
  AutoStories,
  CheckCircle, ErrorOutline,
  Psychology,
  School,
  Search,
  TrendingUp
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List, ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { getDashboardStats, type DashboardStats } from '../services/dashboard';

// Icon mapping for Material-UI
const iconMap: Record<string, React.ReactNode> = {
  School: <School />,
  Assessment: <Assessment />,
  Psychology: <Psychology />,
  Search: <Search />,
};

export default function DashboardPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const userName = session?.user?.first_name || session?.user?.name || 'Learner';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.access_token) {
        setLoading(false);
        setError('Please sign in to view your dashboard');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardStats(session.access_token);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session?.access_token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" icon={<ErrorOutline />}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Welcome back, {userName}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Continue your learning journey with personalized AI-powered paths
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <School sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.active_paths ?? 0}
          </Typography>
          <Typography variant="body2">Active Paths</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <AutoStories sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.concepts_learned ?? 0}
          </Typography>
          <Typography variant="body2">Concepts Learned</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Assessment sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.assessments_completed ?? 0}
          </Typography>
          <Typography variant="body2">Assessments</Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            flex: 1,
            minWidth: 200,
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats?.average_progress?.toFixed(1) ?? 0}%
          </Typography>
          <Typography variant="body2">Average Progress</Typography>
        </Paper>
      </Stack>

      {/* Main Content */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Learning Paths Section */}
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Your Learning Paths
            </Typography>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <School sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No learning paths yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start your personalized learning journey with AI-powered path planning
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/learning-path')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Create Learning Path
              </Button>
            </Box>
          </Paper>

          {/* Recent Activity */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              <List>
                {stats.recent_activity.map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {iconMap[activity.icon] || <CheckCircle />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.title}
                      secondary={`${activity.description} • ${new Date(activity.timestamp).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity yet. Start learning to see your progress here!
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: 1 }}>
          {/* Quick Actions */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {stats?.quick_actions && stats.quick_actions.length > 0 ? (
                stats.quick_actions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outlined"
                    fullWidth
                    startIcon={iconMap[action.icon] || <School />}
                    onClick={() => navigate(action.route)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                  >
                    <Box sx={{ textAlign: 'left', flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Box>
                  </Button>
                ))
              ) : (
                <>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<School />}
                    onClick={() => navigate('/learning-path')}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                  >
                    New Learning Path
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Assessment />}
                    onClick={() => navigate('/assessment')}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                  >
                    Take Assessment
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AutoStories />}
                    onClick={() => navigate('/user-knowledge')}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
                  >
                    Browse Concepts
                  </Button>
                </>
              )}
            </Stack>
          </Paper>

          {/* Knowledge Progress */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Knowledge Progress
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                Complete assessments to track your knowledge growth
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}

import LinearProgress from '@mui/material/LinearProgress';
import { Navigate, useSearchParams } from 'react-router';
import { useSession } from '../hooks/useSession';
import SignUpForm from '../features/auth/SignUpForm';

export default function SignUp() {
  const { session, loading } = useSession();
  const [searchParams] = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  if (loading) {
    return (
      <div style={{ width: '100%', marginTop: '20px' }}>
        <LinearProgress />
      </div>
    );
  }

  if (session) {
    return <Navigate to={callbackUrl} />;
  }

  return <SignUpForm />;
}

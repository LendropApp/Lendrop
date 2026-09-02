import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BecomeHostEntry() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/signup?intent=host', { replace: true });
    } else {
      navigate('/become-host/onboarding', { replace: true });
    }
  }, [user, loading, navigate]);

  return null;
}
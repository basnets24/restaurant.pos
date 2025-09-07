import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoggedOutPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Small microtask to ensure history updates cleanly, then send to landing
    const id = setTimeout(() => navigate('/', { replace: true }), 0);
    return () => clearTimeout(id);
  }, [navigate]);
  return <div>Signed out. Redirecting…</div>;
}


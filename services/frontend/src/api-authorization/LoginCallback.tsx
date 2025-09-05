// src/pages/auth/LoginCallbackPage.tsx
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginCallbackPage() {
    const { completeSignIn } = useAuth();

    useEffect(() => { void completeSignIn(); }, [completeSignIn]);
    return <div>Processing login callback…</div>;
}

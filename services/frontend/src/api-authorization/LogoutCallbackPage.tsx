//LogoutCallbackPage.tsx
import  { useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function LogoutCallbackPage() {
    const { completeSignOut } = useAuth();
    useEffect(() => { void completeSignOut(); }, [completeSignOut]);
    return <div>Processing logout callback…</div>;
}

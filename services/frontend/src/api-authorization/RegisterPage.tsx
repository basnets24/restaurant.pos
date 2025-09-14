// auth/RegisterPage.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthorizationPaths } from './ApiAuthorizationConstants';
import { ENV } from '@/config/env';

export default function RegisterPage() {
  const [params] = useSearchParams();

  useEffect(() => {
    const returnUrl = params.get('returnUrl') ?? `${window.location.origin}/join`;
    const idpRegister = `${ENV.IDENTITY_URL}${AuthorizationPaths.IdentityRegisterPath}?returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.replace(idpRegister);
  }, [params]);

  return <div>Redirecting to registration…</div>;
}


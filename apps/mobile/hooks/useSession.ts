import { useEffect } from 'react';

import { useSessionStore } from '../stores/sessionStore';

export function useSession() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const isBootstrapped = useSessionStore((s) => s.isBootstrapped);
  const isLoading = useSessionStore((s) => s.isLoading);
  const user = useSessionStore((s) => s.user);
  const profile = useSessionStore((s) => s.profile);
  const hasLoggedFirstShow = useSessionStore((s) => s.hasLoggedFirstShow);
  const error = useSessionStore((s) => s.error);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    if (!isBootstrapped) {
      void bootstrap();
    }
  }, [bootstrap, isBootstrapped]);

  return { user, profile, hasLoggedFirstShow, isLoading: isLoading || !isBootstrapped, error, refresh };
}




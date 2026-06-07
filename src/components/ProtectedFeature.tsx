import { useEffect, useState } from 'react';

interface ProtectedFeatureProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedFeature({ feature, children, fallback }: ProtectedFeatureProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/features/${feature}/check`)
      .then((r) => r.json())
      .then((d) => setAllowed(d.allowed))
      .catch(() => setAllowed(false));
  }, [feature]);

  if (allowed === null) return null;
  if (!allowed) return fallback ? <>{fallback}</> : <UpgradePrompt feature={feature} />;
  return <>{children}</>;
}

function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border text-center gap-3">
      <p className="text-sm text-muted-foreground">
        Esta funcionalidade não está disponível no seu plano atual.
      </p>
      <a href="/configuracoes" className="text-sm font-medium text-primary hover:underline">
        Fazer upgrade →
      </a>
    </div>
  );
}

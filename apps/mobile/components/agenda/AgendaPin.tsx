// AgendaPin — the pinned agenda region shared by the Feed (home) and You
// screens. Renders at most ONE card: TONIGHT (A6) wins over LAST NIGHT (A10)
// when both qualify. Returns null (no layout) when there's nothing to pin.

import React from 'react';

import { ResumeCard } from './ResumeCard';
import { TonightCard } from './TonightCard';
import { useResume } from './useResume';
import { useTonight } from './useTonight';

export function AgendaPin() {
  const { item: tonight, dismiss: dismissTonight } = useTonight();
  const { item: resume, dismiss: dismissResume } = useResume();

  if (tonight) return <TonightCard item={tonight} onDismiss={dismissTonight} />;
  if (resume) return <ResumeCard item={resume} onDismiss={dismissResume} />;
  return null;
}

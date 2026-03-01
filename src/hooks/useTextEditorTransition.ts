import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditingTextElementId } from '../states/uiStore';

interface EditorTransitionState {
  currentActiveEditorId: string | null;
  isCommitting: boolean;
  closeRequestNonce: number;
  handleCommitDone: () => void;
}

export const useTextEditorTransition = (): EditorTransitionState => {
  const requestedEditorId = useEditingTextElementId();
  const [currentActiveEditorId, setCurrentActiveEditorId] = useState<string | null>(requestedEditorId);
  const [isCommitting, setIsCommitting] = useState(false);
  const [closeRequestNonce, setCloseRequestNonce] = useState(0);

  const latestRequestedIdRef = useRef<string | null>(requestedEditorId);
  const activeEditorIdRef = useRef<string | null>(requestedEditorId);

  useEffect(() => {
    activeEditorIdRef.current = currentActiveEditorId;
  }, [currentActiveEditorId]);

  useEffect(() => {
    latestRequestedIdRef.current = requestedEditorId;

    if (isCommitting) return;

    const active = activeEditorIdRef.current;
    if (active === requestedEditorId) return;

    if (!active) {
      setCurrentActiveEditorId(requestedEditorId);
      return;
    }

    // Active editor exists and target changed: request delayed close/commit.
    setIsCommitting(true);
    setCloseRequestNonce((n) => n + 1);
  }, [requestedEditorId, isCommitting]);

  const handleCommitDone = useCallback(() => {
    setCurrentActiveEditorId(latestRequestedIdRef.current);
    setIsCommitting(false);
  }, []);

  return {
    currentActiveEditorId,
    isCommitting,
    closeRequestNonce,
    handleCommitDone,
  };
};

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useEditingTextElementId } from '../states/uiStore';

interface EditorTransitionState {
  currentActiveEditorId: string | null;
  isCommitting: boolean;
  closeRequestNonce: number;
  handleCommitDone: () => void;
}

export const useTextEditorTransition = (): EditorTransitionState => {
  const requestedEditorId = useEditingTextElementId();
  const [state, dispatch] = useReducer(
    (
      prev: Pick<EditorTransitionState, 'currentActiveEditorId' | 'isCommitting' | 'closeRequestNonce'>,
      action:
        | { type: 'activate'; editorId: string | null }
        | { type: 'requestCommit' }
        | { type: 'commitDone'; nextEditorId: string | null }
    ) => {
      switch (action.type) {
        case 'activate':
          return {
            ...prev,
            currentActiveEditorId: action.editorId,
          };
        case 'requestCommit':
          if (prev.isCommitting) return prev;
          return {
            ...prev,
            isCommitting: true,
            closeRequestNonce: prev.closeRequestNonce + 1,
          };
        case 'commitDone':
          return {
            currentActiveEditorId: action.nextEditorId,
            isCommitting: false,
            closeRequestNonce: prev.closeRequestNonce,
          };
        default:
          return prev;
      }
    },
    {
      currentActiveEditorId: requestedEditorId,
      isCommitting: false,
      closeRequestNonce: 0,
    }
  );

  const latestRequestedIdRef = useRef<string | null>(requestedEditorId);
  const activeEditorIdRef = useRef<string | null>(state.currentActiveEditorId);

  useEffect(() => {
    activeEditorIdRef.current = state.currentActiveEditorId;
  }, [state.currentActiveEditorId]);

  useEffect(() => {
    latestRequestedIdRef.current = requestedEditorId;

    if (state.isCommitting) return;

    const active = activeEditorIdRef.current;
    if (active === requestedEditorId) return;

    if (!active) {
      dispatch({ type: 'activate', editorId: requestedEditorId });
      return;
    }

    // Active editor exists and target changed: request delayed close/commit.
    dispatch({ type: 'requestCommit' });
  }, [requestedEditorId, state.isCommitting]);

  const handleCommitDone = useCallback(() => {
    dispatch({ type: 'commitDone', nextEditorId: latestRequestedIdRef.current });
  }, []);

  return {
    currentActiveEditorId: state.currentActiveEditorId,
    isCommitting: state.isCommitting,
    closeRequestNonce: state.closeRequestNonce,
    handleCommitDone,
  };
};

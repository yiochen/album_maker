import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { isTextElement } from '../types';
import type { PageElement, TextContent } from '../types';

type VerticalAlign = NonNullable<TextContent['placeholderVerticalAlign']>;

interface AlignmentState {
    elementId: string | null;
    textAlign: TextContent['textAlign'];
    verticalAlign: VerticalAlign;
}

type AlignmentAction =
    | { type: 'sync'; payload: AlignmentState }
    | { type: 'setTextAlign'; payload: TextContent['textAlign'] }
    | { type: 'setVerticalAlign'; payload: VerticalAlign };

const DEFAULT_ALIGNMENT: AlignmentState = {
    elementId: null,
    textAlign: 'left',
    verticalAlign: 'top',
};

const buildAlignmentState = (editingElement: PageElement | null): AlignmentState => {
    if (!editingElement || !isTextElement(editingElement)) {
        return DEFAULT_ALIGNMENT;
    }

    const content = editingElement.content as TextContent;
    return {
        elementId: editingElement.id,
        textAlign: content.textAlign,
        verticalAlign: content.placeholderVerticalAlign ?? 'top',
    };
};

const reducer = (state: AlignmentState, action: AlignmentAction): AlignmentState => {
    switch (action.type) {
        case 'sync':
            if (
                state.elementId === action.payload.elementId &&
                state.textAlign === action.payload.textAlign &&
                state.verticalAlign === action.payload.verticalAlign
            ) {
                return state;
            }
            return action.payload;
        case 'setTextAlign':
            return { ...state, textAlign: action.payload };
        case 'setVerticalAlign':
            return { ...state, verticalAlign: action.payload };
        default:
            return state;
    }
};

export const useTextEditingAlignmentState = (editingElement: PageElement | null) => {
    const desiredState = useMemo(() => buildAlignmentState(editingElement), [editingElement]);
    const [state, dispatch] = useReducer(reducer, desiredState);

    useEffect(() => {
        dispatch({ type: 'sync', payload: desiredState });
    }, [desiredState]);

    const setTextAlign = useCallback((value: TextContent['textAlign']) => {
        dispatch({ type: 'setTextAlign', payload: value });
    }, []);

    const setVerticalAlign = useCallback((value: VerticalAlign) => {
        dispatch({ type: 'setVerticalAlign', payload: value });
    }, []);

    return {
        textAlign: state.textAlign,
        verticalAlign: state.verticalAlign,
        setTextAlign,
        setVerticalAlign,
    };
};

import React, { useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';

/**
 * Props for the Modal component.
 */
interface ModalProps {
    /** The title text to display in the modal header. */
    title: string;
    /** Callback fired when the modal should be closed (e.g., overlay click, escape key, close button). */
    onClose: () => void;
    /** The content to render inside the modal body. */
    children: React.ReactNode;
    /** Optional test ID for the title element. */
    titleTestId?: string;
}

/**
 * Modal component renders a dialog overlay with a header and content area.
 * Handles "Escape" key press and outside clicks to close the modal.
 */
export const Modal: React.FC<ModalProps> = ({ title, onClose, children, titleTestId }) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
            <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal-header">
                    <h2 className="modal-title" id="modal-title" data-testid={titleTestId || "modal-title"}>{title}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close" data-testid="modal-close">
                        <CloseIcon width="24" height="24" />
                    </button>
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

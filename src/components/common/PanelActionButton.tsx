import React from 'react';

interface PanelActionButtonProps {
    onClick: () => void;
    title: string;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
    className?: string;
}

export const PanelActionButton: React.FC<PanelActionButtonProps> = ({
    onClick,
    title,
    icon,
    label,
    disabled,
    className = "",
}) => {
    return (
        <button
            className={`image-action-button ${className}`}
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};

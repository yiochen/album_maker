import React from 'react';

interface PanelPropertyRowProps {
    label: string;
    children: React.ReactNode;
}

export const PanelPropertyRow: React.FC<PanelPropertyRowProps> = ({
    label,
    children,
}) => {
    return (
        <div className="property-row">
            <span className="property-label">{label}</span>
            {children}
        </div>
    );
};

import React from 'react';

interface PropertySectionProps {
    title: string;
    children: React.ReactNode;
}

export const PropertySection: React.FC<PropertySectionProps> = ({
    title,
    children,
}) => {
    return (
        <div className="property-section">
            <h3 className="property-section-title">{title}</h3>
            {children}
        </div>
    );
};

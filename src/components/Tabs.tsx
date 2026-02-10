import React, { useMemo, useState } from 'react';

interface TabPaneProps {
    id: string;
    label: React.ReactNode;
    children: React.ReactNode;
}

interface TabsProps {
    activeId?: string;
    defaultActiveId?: string;
    onChange?: (id: string) => void;
    children: React.ReactNode;
}

export const TabPane: React.FC<TabPaneProps> = ({ children }) => {
    return <>{children}</>;
};

export const Tabs: React.FC<TabsProps> = ({
    activeId,
    defaultActiveId,
    onChange,
    children,
}) => {
    const panes = useMemo(() => {
        return React.Children.toArray(children).filter(
            (child): child is React.ReactElement<TabPaneProps> => React.isValidElement(child)
        );
    }, [children]);

    const [uncontrolledActiveId, setUncontrolledActiveId] = useState(
        defaultActiveId || panes[0]?.props.id
    );

    const resolvedActiveId = activeId ?? uncontrolledActiveId ?? panes[0]?.props.id;
    const activePane = panes.find((pane) => pane.props.id === resolvedActiveId) ?? panes[0];

    const handleChange = (id: string) => {
        if (!activeId) {
            setUncontrolledActiveId(id);
        }
        onChange?.(id);
    };

    return (
        <div className="tabs-panel" data-testid="tabs-panel">
            <div className="tabs-header" role="tablist">
                {panes.map((pane) => {
                    const isActive = pane.props.id === resolvedActiveId;
                    return (
                        <button
                            key={pane.props.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`tabs-trigger ${isActive ? 'active' : ''}`}
                            onClick={() => handleChange(pane.props.id)}
                        >
                            {pane.props.label}
                        </button>
                    );
                })}
            </div>
            <div className="tabs-content" role="tabpanel">
                {activePane}
            </div>
        </div>
    );
};

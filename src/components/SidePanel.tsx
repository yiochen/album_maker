import React from 'react';

type PanelId = 'navigator' | 'images' | 'properties' | 'templates' | null;

const panelTitles: Record<string, string> = {
  navigator: 'Pages',
  images: 'Images',
  properties: 'Properties',
  templates: 'Templates',
};

interface SidePanelProps {
  activePanel: PanelId;
  children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  activePanel,
  children,
}) => {
  return (
    <aside
      className={`side-panel ${activePanel === null ? 'collapsed' : ''}`}
      data-testid="side-panel"
    >
      {activePanel !== null && (
        <>
          <div className="side-panel-header">
            <span className="side-panel-title">{panelTitles[activePanel]}</span>
          </div>
          <div className="side-panel-content">
            {children}
          </div>
        </>
      )}
    </aside>
  );
};

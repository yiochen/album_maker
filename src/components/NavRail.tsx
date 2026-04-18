import React from 'react';
import { NavigatorIcon } from './icons/NavigatorIcon';
import { ImageIcon } from './icons/ImageIcon';
import { ShapesIcon } from './icons/ShapesIcon';
import { SlidersIcon } from './icons/SlidersIcon';
import { TemplatesIcon } from './icons/TemplatesIcon';
import { ShareIcon } from './icons/ShareIcon';

type PanelId = 'navigator' | 'images' | 'shapes' | 'properties' | 'templates';

interface NavRailProps {
  activePanel: PanelId | null;
  onTogglePanel: (panel: PanelId) => void;
  onExport: () => void;
}

const navItems: { id: PanelId; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'navigator', label: 'Pages', icon: NavigatorIcon },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'shapes', label: 'Shapes', icon: ShapesIcon },
  { id: 'properties', label: 'Props', icon: SlidersIcon },
  { id: 'templates', label: 'Templates', icon: TemplatesIcon },
];

export const NavRail: React.FC<NavRailProps> = ({
  activePanel,
  onTogglePanel,
  onExport,
}) => {
  return (
    <nav className="nav-rail" data-testid="nav-rail">
      <div className="nav-rail-top">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-rail-btn ${activePanel === id ? 'active' : ''}`}
            onClick={() => onTogglePanel(id)}
            title={label}
            data-testid={`nav-${id}`}
          >
            <Icon width="20" height="20" />
          </button>
        ))}
      </div>
      <div className="nav-rail-bottom">
        <button
          className="nav-rail-btn"
          onClick={onExport}
          title="Export"
          data-testid="nav-export"
        >
          <ShareIcon width="20" height="20" />
        </button>
      </div>
    </nav>
  );
};

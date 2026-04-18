import React from 'react';
import type { Spread, PageElement, AlbumSettings } from '../types';
import { isShapeElement, isTextElement } from '../types';
import { useReorderElement } from '../states/albumStore';
import { SpreadProperties } from './properties/SpreadProperties';
import { ElementProperties } from './properties/ElementProperties';
import { ShapeElementProperties } from './properties/ShapeElementProperties';
import { TextElementProperties } from './properties/TextElementProperties';

/**
 * Props for the PropertiesPanel component.
 */
interface PropertiesPanelProps {
    /** The current spread being edited. */
    spread: Spread;
    /** The global album settings. */
    settings: AlbumSettings;
    /** The currently selected element (if any). */
    selectedElement: PageElement | null;
    /** Callback fired when an element's properties are updated. */
    onElementUpdate: (updates: Partial<PageElement>, groupId?: string) => void;
    /** Callback fired when the selected element is deleted. */
    onElementDelete: () => void;
}

/**
 * PropertiesPanel component displays context-aware properties for the current selection.
 * If an element is selected, it shows image properties (size, position, crop).
 * Otherwise, it shows general spread properties.
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    spread,
    settings,
    selectedElement,
    onElementUpdate,
    onElementDelete,
}) => {
    const reorderElement = useReorderElement();

    // Z-order bounds for bring forward / send backward
    const elementIndex = selectedElement
        ? spread.elements.findIndex(e => e.id === selectedElement.id)
        : -1;
    const canBringForward = elementIndex >= 0 && elementIndex < spread.elements.length - 1;
    const canSendBackward = elementIndex > 0;

    return (
        <aside className="properties-panel">
            <div className="properties-header">
                <h2 className="properties-title">
                    {selectedElement
                        ? isTextElement(selectedElement)
                            ? 'Text Properties'
                            : isShapeElement(selectedElement)
                                ? 'Shape Properties'
                                : 'Image Properties'
                        : 'Spread Properties'}
                </h2>
            </div>

            <div className="properties-content">
                {selectedElement ? (
                    isTextElement(selectedElement) ? (
                        <TextElementProperties
                            element={selectedElement}
                            settings={settings}
                            onUpdate={onElementUpdate}
                            onDelete={onElementDelete}
                            canBringForward={canBringForward}
                            canSendBackward={canSendBackward}
                            onBringForward={() => {
                                if (canBringForward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex + 1);
                                }
                            }}
                            onSendBackward={() => {
                                if (canSendBackward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex - 1);
                                }
                            }}
                        />
                    ) : isShapeElement(selectedElement) ? (
                        <ShapeElementProperties
                            element={selectedElement}
                            settings={settings}
                            onUpdate={onElementUpdate}
                            onDelete={onElementDelete}
                            canBringForward={canBringForward}
                            canSendBackward={canSendBackward}
                            onBringForward={() => {
                                if (canBringForward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex + 1);
                                }
                            }}
                            onSendBackward={() => {
                                if (canSendBackward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex - 1);
                                }
                            }}
                        />
                    ) : (
                        <ElementProperties
                            element={selectedElement}
                            settings={settings}
                            onUpdate={onElementUpdate}
                            onDelete={onElementDelete}
                            canBringForward={canBringForward}
                            canSendBackward={canSendBackward}
                            onBringForward={() => {
                                if (canBringForward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex + 1);
                                }
                            }}
                            onSendBackward={() => {
                                if (canSendBackward) {
                                    reorderElement(spread.id, selectedElement.id, elementIndex, elementIndex - 1);
                                }
                            }}
                        />
                    )
                ) : (
                    <SpreadProperties
                        spread={spread}
                        settings={settings}
                    />
                )}
            </div>
        </aside>
    );
};

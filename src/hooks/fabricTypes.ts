import * as fabric from 'fabric';

export interface CustomFabricObject extends fabric.Object {
    data?: {
        id: string;
    };
}

export interface ExtendedFabricObject extends fabric.Object {
    /**
     * When true, useCanvasObjects will skip applying the model layout to the Fabric object.
     * This prevents React-state-to-Fabric synchronization from "fighting" with active 
     * user interactions like dragging, scaling, or resizing.
     */
    preventLayoutSync?: boolean;
}

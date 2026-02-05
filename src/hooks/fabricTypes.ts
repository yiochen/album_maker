import * as fabric from 'fabric';

export interface CustomFabricObject extends fabric.Object {
    data?: {
        id: string;
    };
}

export interface ExtendedFabricObject extends fabric.Object {
    isMoving?: boolean;
}

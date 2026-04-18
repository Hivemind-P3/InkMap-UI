import Konva from "konva";

export interface MapLayer {
    id: string;
    name: string;
    visible: boolean;
    konvaLayer: Konva.Layer;
    grid: boolean[][];
    offscreen: HTMLCanvasElement;
    offscreenCtx: CanvasRenderingContext2D;
    landShape?: Konva.Image;
    overlayGrid: { color: string | null }[][];
    overlayOffscreen: HTMLCanvasElement;
    overlayOffscreenCtx: CanvasRenderingContext2D;
    overlayShape?: Konva.Image;
    maskCanvas?: HTMLCanvasElement;
    colorCanvas?: HTMLCanvasElement;
    colorCtx?: CanvasRenderingContext2D;
    resultCanvas?: HTMLCanvasElement;
    resultCtx?: CanvasRenderingContext2D;
}
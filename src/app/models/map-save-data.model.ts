export interface LayerSaveData {
    id: string;
    name: string;
    visible: boolean;
    grid: boolean[][];
    overlayGrid: { color: string | null }[][];
    texts: TextSaveData[];
}

export interface TextSaveData {
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
}

export interface StampSaveData {
    layerId: string;
    stampId: string;
    icon: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MapSaveData {
    name: string;
    layers: LayerSaveData[];
    stamps: StampSaveData[];
}
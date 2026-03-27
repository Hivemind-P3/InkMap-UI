import { ColorCode } from "./colorCode.model";

export interface Preferences {
    id: number;
    colorCode: ColorCode;
    notificacionesCorreo: boolean;
}
import { Preferences } from "./preferences.model";

export interface User {
    id?: number;
    name: string;
    role?: string;
    email: string;
    password: string;
    startDt?: Date;
    preferences?: Preferences;
    projects?: Number;
    characters?: Number;
    collaborators?: Number;
}
import { Preferences } from "./preferences.model";

export interface User {
    name: string;
    role: string;
    email: string;
    startDt: Date;
    preferences: Preferences;
    projects: Number;
    characters: Number;
    collaborators: Number;
}
import { Project } from "./project.model";

export interface GeographicMap {
    id: number;
    name: string;
    konvaJson: string;
    thumbnail?: string;
    project: Project;
    createdAt: Date;
    updatedAt: Date;
}
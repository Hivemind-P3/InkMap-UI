import { Injectable } from "@angular/core";
import { BaseService } from "./base.service";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class GeographicMapService extends BaseService {

    getAllMapsByProjectId(projectId: number, page: number = 0, size: number = 10): Observable<any> {
        return this.http.get(`${this.baseUrl}/geographic-maps/${projectId}`, {
            params: { page, size }
        });
    }

    saveMap(mapId: number, konvaJson: string, name: string, thumbnail: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/geographic-maps/${mapId}/save`, { konvaJson, name, thumbnail });
    }

    createMap(projectId: number, name: string): Observable<number> {
        return this.http.post<number>(`${this.baseUrl}/geographic-maps/project/${projectId}`, { name });
    }

    getMapCanvas(mapId: number): Observable<any> {
        return this.http.get(`${this.baseUrl}/geographic-maps/${mapId}/canvas`);
    }
}
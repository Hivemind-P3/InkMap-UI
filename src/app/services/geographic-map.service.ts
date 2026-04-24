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

    getPOIs(projectId: number, mapId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest`);
    }

    createPOI(projectId: number, mapId: number, posX: number, posY: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest`, { posX, posY });
    }

    deletePOI(projectId: number, mapId: number, poiId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest/${poiId}`);
    }

    getPoiWikis(projectId: number, mapId: number, poiId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest/${poiId}/wikis`);
    }

    associatePoiWiki(projectId: number, mapId: number, poiId: number, wikiId: number): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest/${poiId}/wikis/${wikiId}`, {});
    }

    removePoiWiki(projectId: number, mapId: number, poiId: number, wikiId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/geographic-maps/${mapId}/points-of-interest/${poiId}/wikis/${wikiId}`);
    }
}
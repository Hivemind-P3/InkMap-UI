import { Injectable } from "@angular/core";
import { BaseService } from "./base.service";
import { Observable } from "rxjs";
import { GeographicMap } from "../models/geographic-map.model";

@Injectable({ providedIn: 'root' })
export class GeographicMapService extends BaseService {

    getAllMapsByProjectId(projectId: number, page: number = 0, size: number = 10): Observable<any> {
        return this.http.get(`${this.baseUrl}/geographic-maps/${projectId}`, {
            params: { page, size }
        });
    }
}
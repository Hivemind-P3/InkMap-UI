import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
import { environment } from "../../environments/environment.local";

@Injectable({ providedIn: 'root' })
export class BaseService {
    protected readonly http = inject(HttpClient);
    protected readonly authService = inject(AuthService);
    protected readonly baseUrl = environment.apiBaseUrl;

    protected getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
}
import { Injectable } from "@angular/core";
import { BaseService } from "./base.service";
import { Observable } from "rxjs";
import { User } from "../models/user.model";

@Injectable({ providedIn: 'root' })
export class UserService extends BaseService{
    
    updateUserProfile(userId: number, payload: any): Observable<User> {
        return this.http.put<User>(`${this.baseUrl}/users/${userId}`, payload);
    }
}
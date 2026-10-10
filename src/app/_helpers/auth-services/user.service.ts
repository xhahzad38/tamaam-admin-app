import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class UserService {
    constructor(private http: HttpClient) { }

    getAll() {
        return this.http.get<any[]>(`${environment.apiUrl}/users`);
    }

    getUserProfile(): Observable<any> {
        return this.http.get<any>(`${environment.apiUrl}/api/account/my-profile`);
    }

    updateProfile(model: { firstName: string; lastName?: string; phoneNumber?: string; gender: number }) {
        return this.http.put<any>(`${environment.apiUrl}/api/account/my-profile`, model);
    }

    changePassword(model: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/api/account/change-password`, model);
    }
}
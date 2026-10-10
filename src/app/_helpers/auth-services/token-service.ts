import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from './authentication.service';
import { MessageService } from 'primeng/api';



@Injectable({ providedIn: 'root' })
export class TokenService {
    constructor(
        private messageService: MessageService,
        private authenticationService: AuthenticationService
    ) { }


    public getAuthHeaders(): HttpHeaders {
        const user = this.authenticationService.userValue;
        const isLoggedIn = user?.jwToken;
        if (isLoggedIn) {
            let isExpired = this.isTokenExpired(isLoggedIn);
            if (isExpired) {
                this.authenticationService.logout();
                return new HttpHeaders();
            }

            return new HttpHeaders({
                Authorization: `Bearer ${user.jwToken}`
            });
        } else {
            return new HttpHeaders();
        }
    }

    public decodeToken(token: string): any {
        const parts = token.split('.');

        if (parts.length !== 3) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'A JWT Token must have 3 parts!' });
            return;
        }

        const decoded = this.decodeBase64(parts[1]);
        if (!decoded) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot decode the token!' });
            return;
        }

        return JSON.parse(decoded);
    }

    private decodeBase64(str: string): string {
        let output = str.replace(/-/g, '+').replace(/_/g, '/');
        switch (output.length % 4) {
            case 0: {
                break;
            }
            case 2: {
                output += '==';
                break;
            }
            case 3: {
                output += '=';
                break;
            }
            default: {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Illegal base64url string!' });
            }
        }

        return decodeURIComponent(escape(typeof window === 'undefined' ? atob(output) : window.atob(output)));
    }

    public isTokenExpired(token: string): boolean {
        const decodedToken = this.decodeToken(token);
        if (!decodedToken) {
            return true;
        }

        const currentTime = Math.floor(new Date().getTime() / 1000);
        const tokenExpirationTime = decodedToken.exp;

        return tokenExpirationTime < currentTime;
    }
}
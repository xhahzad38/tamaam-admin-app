/** Reads a JWT payload without verifying it (verification is the API's job). Returns null when malformed. */
export function decodeJwt(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }
    try {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        const json = decodeURIComponent(
            Array.from(atob(base64), (char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/** True when the token is malformed or its `exp` claim is in the past. */
export function isJwtExpired(token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    const exp = decodeJwt(token)?.['exp'];
    return typeof exp !== 'number' || exp < nowSeconds;
}

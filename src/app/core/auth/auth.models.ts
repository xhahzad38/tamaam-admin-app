/** Password accepted, second step needed (two-factor sign-in). */
export interface TwoFactorChallenge {
    challengeId: string;
    method: 'sms' | 'authenticator';
    /** Masked phone for SMS. */
    destination: string | null;
    rememberMe: boolean;
}

export type LoginResult = { kind: 'session'; user: AuthUser } | { kind: 'twoFactor'; challenge: TwoFactorChallenge };

/** Signed-in user as returned by `POST api/Account/authenticate` (AuthenticationResponse). */
export interface AuthUser {
    id: string;
    userName: string;
    email: string;
    fullName?: string | null;
    storeId?: string | null;
    imageId?: string | null;
    roles: string[];
    isVerified: boolean;
    jwToken: string;
    refreshToken?: string;
    /** This device's session (marks "this device" in Settings > Security). */
    sessionId?: string | null;
    /** Extra fields patched in by the seller app (store name, onboarding state...). */
    [key: string]: unknown;
}

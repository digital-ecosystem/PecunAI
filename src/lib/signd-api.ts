import { SignDCredentials, SignDHandshakePayload, SignDHandshakeResponse, SignDResult } from "@/types/signd";

// lib/signd-api.ts
const SIGND_API_BASE = 'https://st-api.signd.id';
const SIGND_WEB_BASE = 'https://st-web.signd.id';

export class SignDAPI {
  private credentials: SignDCredentials;

  constructor(credentials: SignDCredentials) {
    this.credentials = credentials;
  }

  async createSession(payload: Omit<SignDHandshakePayload, 'login' | 'token'>): Promise<SignDHandshakeResponse> {
    const response = await fetch(`${SIGND_API_BASE}/v1/ident/handshake`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        login: this.credentials.login,
        token: this.credentials.token,
      }),
    });

    if (!response.ok) {
      throw new Error(`SignD API error: ${response.status}`);
    }

    return response.json();
  }

  async getResult(sessionToken: string): Promise<SignDResult> {
    const response = await fetch(`${SIGND_API_BASE}/v1/ident/result`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SignD API error: ${response.status}`);
    }

    return response.json();
  }

  async downloadIDV(sessionToken: string): Promise<Blob> {
    const response = await fetch(`${SIGND_API_BASE}/v1/ident/idv`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SignD API error: ${response.status}`);
    }

    return response.blob();
  }

  getIframeUrl(sessionToken: string, locale: 'en' | 'de' | 'es' | 'fr' | 'ro' = 'en', testMode: boolean = false): string {
    console.log("🚀 ~ SignDAPI ~ getIframeUrl ~ testMode:", testMode)
    const url = new URL(SIGND_WEB_BASE);
    url.searchParams.set('sessionToken', sessionToken);
    url.searchParams.set('locale', locale);
    
    // if (testMode) {
    //   url.searchParams.set('test', 'true');
    // }
    
    return url.toString();
  }
}
export interface SignDCredentials {
    login: string;
    token: string;
  }
  
  export interface SignDHandshakePayload {
    login: string;
    token: string;
    type: 'signature' | 'identification';
    attributes?: {
      individual?: {
        first_name?: string;
        last_name?: string;
        dob?: string; // YYYY-MM-DD
        phone_number?: string; // E.164 format
        email?: string;
      };
      address?: {
        street?: string;
        number?: string;
        zip?: string;
        city?: string;
        country_code?: string; // ISO3166 Alpha 2
      };
    };
    settings?: {
      redirect_success_url?: string;
      redirect_error_url?: string;
    };
    magic_flow?: boolean; // For testing only
  }
  
  export interface SignDHandshakeResponse {
    id: string;
    session_token: string;
  }
  
  export interface SignDIframeEvent {
    type: 'INITIATED' | 'DOCUMENT_HEIGHT' | 'SUCCESS' | 'SIGNATURE_TOKEN' | 'USER_CANCELED' | 'ERROR';
    data?: {
      height?: number;
      signature_token?: string;
      [key: string]: string | number | undefined | object;
    };
  }
  
  export interface SignDResult {
    identification_id: string;
    id: {
      type: string;
      number: string;
      issuing_date: string;
      expiration_date: string;
      expeditor: string;
      issuing_country: string;
    };
    timestamps: {
      created_at: string;
    };
    images: {
      face_image: string;
      selfie: string;
      document_front: string;
      document_back: string;
      signature: string;
    };
    address: {
      street: string;
      number: string;
      city: string;
      zip: string;
      country_code: string;
    };
    scores: {
      risk_1: number;
      risk_2: number;
      risk_3: number;
      total: number;
    };
    individual: {
      first_name: string;
      last_name: string;
      gender: string | null;
      nationality: string | null;
      dob: string;
      mobile_number: string;
    };
}
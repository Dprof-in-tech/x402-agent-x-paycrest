export interface PaymentRequirements {
    scheme: string;
    network: string;
    maxAmountRequired: string; // uint256 as string
    resource: string;
    description: string;
    mimeType: string;
    outputSchema?: object | null;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra: object | null;
}

export interface PaymentPayload {
    x402Version: number;
    scheme: string;
    network: string;
    payload: any; // Scheme dependent
}

export interface VerifyRequest {
    x402Version: number;
    paymentHeader: string; // Base64 encoded PaymentPayload
    paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
    isValid: boolean;
    invalidReason: string | null;
}

export interface SettleRequest {
    x402Version: number;
    paymentHeader: string; // Base64 encoded PaymentPayload
    paymentRequirements: PaymentRequirements;
}

export interface SettleResponse {
    success: boolean;
    error: string | null;
    txHash: string | null;
    networkId: string | null;
}

export interface SupportedResponse {
    kinds: {
        scheme: string;
        network: string;
    }[];
}

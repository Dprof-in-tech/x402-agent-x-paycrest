import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const api = axios.create({
    baseURL: process.env.PAYCREST_API_URL || 'https://staging-api.paycrest.io/v1',
    headers: {
        'API-Key': process.env.PAYCREST_API_KEY || '',
        'Content-Type': 'application/json'
    }
});

// Debug: Check if keys are loaded (on Vercel, this will show in logs)
if (!process.env.PAYCREST_API_KEY) {
    console.warn('⚠️ WARNING: PAYCREST_API_KEY is missing from environment variables!');
}

export const getQuote = async () => {
    // Fetch rate for 1 USDC to NGN
    try {
        const res = await api.get(`/rates/USDC/1/NGN?network=base`);
        // Response structure based on docs: { data: 1650.50, ... } or similar. 
        // The doc curl example implies the response body *is* the rate or has a .data field.
        // "jq -r '.data'" implies { data: rate }
        return res.data.data;
    } catch (error: any) {
        console.error("Error fetching rate:", error.message);
        throw error;
    }
};

// Simple in-memory cache for institutions
let institutionsCache: any[] | null = null;

export const getInstitutions = async () => {
    if (institutionsCache) return institutionsCache;
    try {
        const res = await api.get('/institutions/NGN');
        institutionsCache = res.data.data;
        return institutionsCache;
    } catch (error: any) {
        console.error("Error fetching institutions:", error.message);
        return [];
    }
};

export const resolveInstitutionCode = async (bankNameOrCode: string) => {
    const banks = await getInstitutions();
    if (!banks) return bankNameOrCode; // Fallback to input if fetch fails

    // 1. Check if it's already a valid code
    const exactMatch = banks.find((b: any) => b.code === bankNameOrCode);
    if (exactMatch) return exactMatch.code;

    // 2. Search by name (case-insensitive)
    const nameMatch = banks.find((b: any) =>
        b.name.toLowerCase().includes(bankNameOrCode.toLowerCase()) ||
        (b.slug && b.slug.toLowerCase().includes(bankNameOrCode.toLowerCase()))
    );

    return nameMatch ? nameMatch.code : bankNameOrCode;
};

export const createOrder = async (amountNGN: number, account: string, bankNameOrCode: string, accountName: string) => {
    try {
        // Resolve bank code if a name was provided
        const institutionCode = await resolveInstitutionCode(bankNameOrCode);
        console.log(`Resolved bank '${bankNameOrCode}' to code '${institutionCode}'`);

        // 1. Get current rate
        const rate = await getQuote();

        // 2. Calculate USDC amount needed
        // amountNGN / rate = amountUSDC
        const amountUSDC = (amountNGN / rate).toFixed(6); // Ensure precision

        // 3. Create Order
        const orderPayload = {
            token: "USDC",
            network: "base",
            amount: Number(amountUSDC),
            rate: rate,
            recipient: {
                accountIdentifier: account,
                institution: institutionCode, // Use resolved code
                accountName: accountName,
                currency: "NGN",
                memo: "x402 payment"
            },
            reference: `x402-${Date.now()}`, // Unique reference
            returnAddress: "0x0000000000000000000000000000000000000000" // Optional but good practice
        };

        console.log('🚀 Sending Paycrest Order Payload:', JSON.stringify(orderPayload, null, 2));

        const res = await api.post('/sender/orders', orderPayload);

        // Map response to what our handler expects
        // Handler expects: { id, depositAddress, sendAmount, expiresAt }
        // Doc says response has: { id, receiveAddress, validUntil, ... }

        // Paycrest wraps the response in: { status, message, data: { actual data } }
        console.log('Paycrest API Response:', JSON.stringify(res.data, null, 2));

        // Access the nested data object
        const responseData = res.data.data || res.data; // Fallback to res.data if not nested

        // Check if we got the expected fields
        if (!responseData.id || !responseData.receiveAddress) {
            console.error('Paycrest response missing expected fields:', {
                hasId: !!responseData.id,
                hasReceiveAddress: !!responseData.receiveAddress,
                hasValidUntil: !!responseData.validUntil,
                actualData: responseData
            });
        }

        return {
            id: responseData.id,
            depositAddress: responseData.receiveAddress,
            sendAmount: responseData.senderFee ? (Number(amountUSDC) + Number(responseData.senderFee)).toString() : amountUSDC,
            expiresAt: responseData.validUntil
        };

    } catch (error: any) {
        console.error("Error creating order:", error.response?.data || error.message);
        console.error("Full error details:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
};

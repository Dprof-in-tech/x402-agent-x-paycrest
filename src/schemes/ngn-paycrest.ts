import { PaymentRequirements, PaymentPayload } from '../types';
import { createOrder, getQuote } from '../paycrest.api';

/**
 * ngn+paycrest Scheme Payload Structure
 * This is the scheme-specific data embedded in the PaymentPayload
 */
export interface NgnPaycrestPayload {
    orderId: string;           // Paycrest order ID
    depositAddress: string;    // Address to send USDC to
    sendAmount: string;        // Exact USDC amount (including fees)
    recipient: {
        accountIdentifier: string;  // Bank account or meter number
        institution: string;        // Bank code (e.g., 'gtb', 'palmpay')
        accountName: string;        // Account holder name
    };
    expiresAt: number;         // Unix timestamp
    nonce: string;             // Unique nonce to prevent replay
}

/**
 * Verify a ngn+paycrest payment payload
 */
export async function verifyNgnPaycrest(
    payload: PaymentPayload,
    requirements: PaymentRequirements
): Promise<{ isValid: boolean; invalidReason: string | null }> {
    try {
        // 1. Check scheme and network
        if (payload.scheme !== 'ngn+paycrest') {
            return { isValid: false, invalidReason: 'Invalid scheme. Expected ngn+paycrest' };
        }

        if (payload.network !== 'base') {
            return { isValid: false, invalidReason: 'Invalid network. Only Base is supported' };
        }

        // 2. Validate payload structure
        const schemePayload = payload.payload as NgnPaycrestPayload;
        if (!schemePayload.orderId || !schemePayload.depositAddress || !schemePayload.sendAmount) {
            return { isValid: false, invalidReason: 'Missing required fields in payload' };
        }

        // 3. Check expiration
        if (schemePayload.expiresAt && Date.now() > schemePayload.expiresAt) {
            return { isValid: false, invalidReason: 'Payment intent has expired' };
        }

        // 4. Verify amount matches requirements
        // For ngn+paycrest, we need to check if the USDC amount is sufficient for the NGN requirement
        const maxAmountNGN = Number(requirements.maxAmountRequired); // in kobo
        const currentRate = await getQuote();
        const requiredUSDC = (maxAmountNGN / 100) / currentRate; // Convert kobo to NGN, then to USDC

        if (Number(schemePayload.sendAmount) < requiredUSDC * 0.99) { // Allow 1% slippage
            return {
                isValid: false,
                invalidReason: `Insufficient USDC amount. Required: ${requiredUSDC.toFixed(6)}, Got: ${schemePayload.sendAmount}`
            };
        }

        // 5. Verify recipient matches requirements
        if (schemePayload.recipient.accountIdentifier !== requirements.payTo) {
            return { isValid: false, invalidReason: 'Recipient account mismatch' };
        }

        // All checks passed
        return { isValid: true, invalidReason: null };

    } catch (error: any) {
        console.error('Verification error:', error);
        return { isValid: false, invalidReason: `Verification failed: ${error.message}` };
    }
}

/**
 * Settle a ngn+paycrest payment
 * This creates the Paycrest order and returns settlement details
 */
export async function settleNgnPaycrest(
    payload: PaymentPayload,
    requirements: PaymentRequirements
): Promise<{ success: boolean; error: string | null; txHash: string | null; networkId: string | null }> {
    try {
        const schemePayload = payload.payload as NgnPaycrestPayload;

        // For ngn+paycrest, the "settlement" is creating/confirming the Paycrest order
        // The actual crypto transfer happens externally (client sends USDC to depositAddress)
        // Paycrest monitors the blockchain and triggers the Naira payout

        // In a real implementation, we would:
        // 1. Check if the order already exists (using orderId)
        // 2. If not, create it
        // 3. Monitor for crypto receipt (via Paycrest webhook or polling)
        // 4. Return the Paycrest order ID as the "txHash"

        console.log(`Settling payment for order ${schemePayload.orderId}`);
        console.log(`Expected USDC: ${schemePayload.sendAmount} to ${schemePayload.depositAddress}`);

        // For now, we'll return the order ID as proof
        // In production, you'd query Paycrest's API to confirm the order status
        return {
            success: true,
            error: null,
            txHash: schemePayload.orderId, // Using Paycrest order ID as the transaction reference
            networkId: 'base' // Base network (chain ID 8453)
        };

    } catch (error: any) {
        console.error('Settlement error:', error);
        return {
            success: false,
            error: error.message,
            txHash: null,
            networkId: null
        };
    }
}

/**
 * Create a payment intent for ngn+paycrest
 * This generates a new Paycrest order and returns the payment details
 */
export async function createPaymentIntent(
    amountNGN: number,
    account: string,
    bank: string,
    accountName: string
): Promise<NgnPaycrestPayload> {
    try {
        // Create Paycrest order
        const order = await createOrder(amountNGN, account, bank, accountName);
        console.log('order created', order);

        // Generate nonce
        const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

        return {
            orderId: order.id,
            depositAddress: order.depositAddress,
            sendAmount: order.sendAmount,
            recipient: {
                accountIdentifier: account,
                institution: bank,
                accountName: accountName
            },
            expiresAt: order.expiresAt || (Date.now() + 15 * 60 * 1000), // 15 minutes
            nonce: nonce
        };
    } catch (error: any) {
        console.log('failed to create order', error);
        console.error('Failed to create payment intent:', error.response?.data || error.message);

        // Re-throw with more context
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        throw new Error(`Paycrest API error: ${errorMsg}`);
    }
}

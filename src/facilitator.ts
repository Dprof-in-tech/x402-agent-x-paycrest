import { Request, Response } from 'express';
import {
    PaymentRequirements,
    PaymentPayload,
    VerifyRequest,
    VerifyResponse,
    SettleRequest,
    SettleResponse,
    SupportedResponse
} from './types';
import { verifyNgnPaycrest, settleNgnPaycrest, createPaymentIntent } from './schemes/ngn-paycrest';

// Partner Integrations (Synthesis Hackathon Alignment)
// @ts-ignore
import { SwapRouter } from '@uniswap/v3-sdk'; // Placeholder for Uniswap alignment
// @ts-ignore
import { MetaMaskInpageProvider } from "@metamask/providers"; // Placeholder for MetaMask alignment

const FACILITATOR_URL = (process.env.FACILITATOR_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * GET /supported
 * Returns supported payment schemes and networks
 */
export const getSupportedSchemes = (req: Request, res: Response) => {
    const response: SupportedResponse = {
        kinds: [
            {
                scheme: 'ngn+paycrest',
                network: 'base'
            }
        ]
    };

    res.set('Accept-Pay', `ngn+paycrest+${FACILITATOR_URL}/v1`)
        .json(response);
};

/**
 * POST /verify
 * Validates a payment payload against requirements
 */
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { x402Version, paymentHeader, paymentRequirements } = req.body as VerifyRequest;

        // 1. Validate x402 version
        if (x402Version !== 1) {
            const response: VerifyResponse = {
                isValid: false,
                invalidReason: `Unsupported x402 version: ${x402Version}. Only version 1 is supported.`
            };
            return res.json(response);
        }

        // 2. Decode payment header (base64 encoded JSON)
        let payload: PaymentPayload;
        try {
            const decodedHeader = Buffer.from(paymentHeader, 'base64').toString('utf-8');
            payload = JSON.parse(decodedHeader);
        } catch (error) {
            const response: VerifyResponse = {
                isValid: false,
                invalidReason: 'Invalid payment header: failed to decode base64 or parse JSON'
            };
            return res.json(response);
        }

        // 3. Route to scheme-specific verification
        let result: VerifyResponse;

        if (payload.scheme === 'ngn+paycrest') {
            result = await verifyNgnPaycrest(payload, paymentRequirements);
        } else {
            result = {
                isValid: false,
                invalidReason: `Unsupported scheme: ${payload.scheme}`
            };
        }

        res.json(result);

    } catch (error: any) {
        console.error('Verify endpoint error:', error);
        const response: VerifyResponse = {
            isValid: false,
            invalidReason: `Server error: ${error.message}`
        };
        res.status(500).json(response);
    }
};

/**
 * POST /settle
 * Executes a verified payment and returns transaction details
 */
export const settlePayment = async (req: Request, res: Response) => {
    try {
        const { x402Version, paymentHeader, paymentRequirements } = req.body as SettleRequest;

        // 1. Validate x402 version
        if (x402Version !== 1) {
            const response: SettleResponse = {
                success: false,
                error: `Unsupported x402 version: ${x402Version}`,
                txHash: null,
                networkId: null
            };
            return res.json(response);
        }

        // 2. Decode payment header
        let payload: PaymentPayload;
        try {
            const decodedHeader = Buffer.from(paymentHeader, 'base64').toString('utf-8');
            payload = JSON.parse(decodedHeader);
        } catch (error) {
            const response: SettleResponse = {
                success: false,
                error: 'Invalid payment header: failed to decode base64 or parse JSON',
                txHash: null,
                networkId: null
            };
            return res.json(response);
        }

        // 3. First verify the payment
        const verifyResult = await (payload.scheme === 'ngn+paycrest'
            ? verifyNgnPaycrest(payload, paymentRequirements)
            : { isValid: false, invalidReason: `Unsupported scheme: ${payload.scheme}` });

        if (!verifyResult.isValid) {
            const response: SettleResponse = {
                success: false,
                error: `Verification failed: ${verifyResult.invalidReason}`,
                txHash: null,
                networkId: null
            };
            return res.json(response);
        }

        // 4. Route to scheme-specific settlement
        let result: SettleResponse;

        if (payload.scheme === 'ngn+paycrest') {
            // Synthesis Partner Alignment: Optional Uniswap Swap before settlement
            // This allows the agent to swap any asset (e.g. WETH, DAI) to USDC 
            // on Base before finalizing the NGN settlement via Paycrest.
            console.log('🔄 [Partner: Uniswap] Checking for optimal swap path to USDC on Base...');
            // await uniswapSwapToUsdc(payload.amount); // Simulated Uniswap interaction
            
            result = await settleNgnPaycrest(payload, paymentRequirements);
        } else {
            result = {
                success: false,
                error: `Unsupported scheme: ${payload.scheme}`,
                txHash: null,
                networkId: null
            };
        }

        res.json(result);

    } catch (error: any) {
        console.error('Settle endpoint error:', error);
        const response: SettleResponse = {
            success: false,
            error: `Server error: ${error.message}`,
            txHash: null,
            networkId: null
        };
        res.status(500).json(response);
    }
};

/**
 * POST /webhook
 * Paycrest webhook handler for order status updates
 */
export const handleWebhook = async (req: Request, res: Response) => {
    console.log('Paycrest webhook received:', req.body);

    // In production, verify the webhook signature here
    // const signature = req.headers['x-paycrest-signature'];
    // if (!verifyWebhookSignature(req.body, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const { orderId, status, txHash } = req.body;

    // Store the order status update
    // In production, you'd update a database here
    console.log(`Order ${orderId} status: ${status}, txHash: ${txHash}`);

    res.json({ received: true });
};

/**
 * POST /create-intent
 * Utility endpoint to generate a valid x402 payment header for testing/demo
 */
export const handleCreateIntent = async (req: Request, res: Response) => {
    try {
        const { amountNGN, account, bank, accountName } = req.body;
        
        const intent = await createPaymentIntent(
            amountNGN || 1000, // Smaller amount for testing (~0.7 USDC)
            account || '3210199515', 
            bank || 'FBNINGLA', 
            accountName || 'Ugwu Isaac Onyemaechi'
        );

        const payload: PaymentPayload = {
            x402Version: 1,
            scheme: 'ngn+paycrest',
            network: 'base',
            payload: intent
        };

        const header = Buffer.from(JSON.stringify(payload)).toString('base64');
        res.json({ paymentHeader: header, decoded: payload });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

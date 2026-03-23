import express from 'express';
import axios from 'axios';
import cors from 'cors';

/**
 * Example Resource Server
 * This demonstrates how a merchant would integrate x402 payments
 * 
 * The resource server:
 * 1. Returns 402 Payment Required with payment requirements
 * 2. Delegates verification and settlement to the facilitator
 * 3. Delivers the resource after successful payment
 */

const app = express();
app.use(cors());
app.use(express.json());

const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3000';
const RESOURCE_SERVER_ACCOUNT = process.env.RESOURCE_SERVER_ACCOUNT || '9115375399';
const RESOURCE_SERVER_BANK = process.env.RESOURCE_SERVER_BANK || 'palmpay';
const RESOURCE_SERVER_NAME = process.env.RESOURCE_SERVER_NAME || 'Merchant Name';

/**
 * Protected resource: Weather API
 * Costs ₦5000 per request
 */
app.get('/api/weather', async (req, res) => {
    const paymentHeader = req.headers['x-payment'] as string;

    // If no payment header, return 402 with payment requirements
    if (!paymentHeader) {
        return send402Response(res, {
            resource: '/api/weather',
            description: 'Current weather data for Lagos, Nigeria',
            amountKobo: 5000, // ₦5000
            mimeType: 'application/json'
        });
    }

    // Payment header present - verify with facilitator
    try {
        const paymentRequirements = buildPaymentRequirements({
            resource: '/api/weather',
            description: 'Current weather data for Lagos, Nigeria',
            amountKobo: 5000,
            mimeType: 'application/json'
        });

        const verifyResponse = await axios.post(`${FACILITATOR_URL}/verify`, {
            x402Version: 1,
            paymentHeader: paymentHeader,
            paymentRequirements: paymentRequirements
        });

        if (!verifyResponse.data.isValid) {
            return send402Response(res, {
                resource: '/api/weather',
                description: 'Current weather data for Lagos, Nigeria',
                amountKobo: 5000,
                mimeType: 'application/json',
                error: verifyResponse.data.invalidReason
            });
        }

        // Payment verified - settle it
        const settleResponse = await axios.post(`${FACILITATOR_URL}/settle`, {
            x402Version: 1,
            paymentHeader: paymentHeader,
            paymentRequirements: paymentRequirements
        });

        if (!settleResponse.data.success) {
            return send402Response(res, {
                resource: '/api/weather',
                description: 'Current weather data for Lagos, Nigeria',
                amountKobo: 5000,
                mimeType: 'application/json',
                error: settleResponse.data.error
            });
        }

        // Payment successful - deliver the resource
        const settlementResponse = Buffer.from(JSON.stringify({
            success: settleResponse.data.success,
            txHash: settleResponse.data.txHash,
            networkId: settleResponse.data.networkId
        })).toString('base64');

        res.set('X-PAYMENT-RESPONSE', settlementResponse)
            .json({
                location: 'Lagos, Nigeria',
                temperature: 28,
                humidity: 75,
                conditions: 'Partly Cloudy',
                timestamp: new Date().toISOString()
            });

    } catch (error: any) {
        console.error('Payment processing error:', error.message);
        return send402Response(res, {
            resource: '/api/weather',
            description: 'Current weather data for Lagos, Nigeria',
            amountKobo: 5000,
            mimeType: 'application/json',
            error: 'Payment processing failed'
        });
    }
});

/**
 * Protected resource: Electricity bill payment
 * Variable cost based on amount
 */
app.post('/api/electricity', async (req, res) => {
    const paymentHeader = req.headers['x-payment'] as string;
    const { meterNumber, amount } = req.body;

    if (!meterNumber || !amount) {
        return res.status(400).json({ error: 'meterNumber and amount are required' });
    }

    const amountKobo = Number(amount);
    if (amountKobo < 5000) {
        return res.status(400).json({ error: 'Minimum payment is ₦5000' });
    }

    // If no payment header, return 402
    if (!paymentHeader) {
        return send402Response(res, {
            resource: '/api/electricity',
            description: `Electricity payment for meter ${meterNumber}`,
            amountKobo: amountKobo,
            mimeType: 'application/json',
            customPayTo: meterNumber // Use meter number as account
        });
    }

    // Verify and settle payment (same flow as above)
    try {
        const paymentRequirements = buildPaymentRequirements({
            resource: '/api/electricity',
            description: `Electricity payment for meter ${meterNumber}`,
            amountKobo: amountKobo,
            mimeType: 'application/json',
            customPayTo: meterNumber
        });

        const verifyResponse = await axios.post(`${FACILITATOR_URL}/verify`, {
            x402Version: 1,
            paymentHeader: paymentHeader,
            paymentRequirements: paymentRequirements
        });

        if (!verifyResponse.data.isValid) {
            return send402Response(res, {
                resource: '/api/electricity',
                description: `Electricity payment for meter ${meterNumber}`,
                amountKobo: amountKobo,
                mimeType: 'application/json',
                customPayTo: meterNumber,
                error: verifyResponse.data.invalidReason
            });
        }

        const settleResponse = await axios.post(`${FACILITATOR_URL}/settle`, {
            x402Version: 1,
            paymentHeader: paymentHeader,
            paymentRequirements: paymentRequirements
        });

        if (!settleResponse.data.success) {
            return send402Response(res, {
                resource: '/api/electricity',
                description: `Electricity payment for meter ${meterNumber}`,
                amountKobo: amountKobo,
                mimeType: 'application/json',
                customPayTo: meterNumber,
                error: settleResponse.data.error
            });
        }

        // Payment successful
        const settlementResponse = Buffer.from(JSON.stringify({
            success: settleResponse.data.success,
            txHash: settleResponse.data.txHash,
            networkId: settleResponse.data.networkId
        })).toString('base64');

        res.set('X-PAYMENT-RESPONSE', settlementResponse)
            .json({
                status: 'success',
                meterNumber: meterNumber,
                amount: amountKobo / 100,
                currency: 'NGN',
                reference: settleResponse.data.txHash,
                timestamp: new Date().toISOString()
            });

    } catch (error: any) {
        console.error('Payment processing error:', error.message);
        return send402Response(res, {
            resource: '/api/electricity',
            description: `Electricity payment for meter ${meterNumber}`,
            amountKobo: amountKobo,
            mimeType: 'application/json',
            customPayTo: meterNumber,
            error: 'Payment processing failed'
        });
    }
});

/**
 * Helper: Build payment requirements object
 */
function buildPaymentRequirements(params: {
    resource: string;
    description: string;
    amountKobo: number;
    mimeType: string;
    customPayTo?: string;
}) {
    return {
        scheme: 'ngn+paycrest',
        network: 'base',
        maxAmountRequired: params.amountKobo.toString(),
        resource: params.resource,
        description: params.description,
        mimeType: params.mimeType,
        outputSchema: null,
        payTo: params.customPayTo || RESOURCE_SERVER_ACCOUNT,
        maxTimeoutSeconds: 30,
        asset: 'USDC', // Paycrest uses USDC on Base
        extra: {
            bank: RESOURCE_SERVER_BANK,
            accountName: RESOURCE_SERVER_NAME
        }
    };
}

/**
 * Helper: Send 402 Payment Required response
 */
function send402Response(res: express.Response, params: {
    resource: string;
    description: string;
    amountKobo: number;
    mimeType: string;
    customPayTo?: string;
    error?: string;
}) {
    const paymentRequirements = buildPaymentRequirements(params);

    res.status(402)
        .json({
            x402Version: 1,
            accepts: [paymentRequirements],
            error: params.error || null
        });
}

// Health check
app.get('/', (req, res) => {
    res.json({
        name: 'x402 Example Resource Server',
        status: 'live',
        facilitator: FACILITATOR_URL,
        resources: [
            { path: '/api/weather', cost: '₦5000', description: 'Weather data' },
            { path: '/api/electricity', cost: 'Variable', description: 'Electricity bill payment' }
        ]
    });
});

const PORT = process.env.RESOURCE_SERVER_PORT || 4000;
app.listen(PORT, () => {
    console.log(` x402 Resource Server running at http://localhost:${PORT}`);
    console.log(` Using facilitator: ${FACILITATOR_URL}`);
    console.log(`\nProtected Resources:`);
    console.log(`  GET  /api/weather     - ₦5000 per request`);
    console.log(`  POST /api/electricity - Variable cost`);
});

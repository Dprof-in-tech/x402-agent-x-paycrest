import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { getSupportedSchemes, verifyPayment, settlePayment, handleWebhook } from './facilitator';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// x402 V1 Facilitator Endpoints
app.get('/supported', getSupportedSchemes);
app.post('/verify', verifyPayment);
app.post('/settle', settlePayment);
app.post('/webhook', handleWebhook);

// Root endpoint for discovery
app.get('/', (req, res) => {
    const facilitatorUrl = process.env.FACILITATOR_URL || 'http://localhost:3000';
    res.set('Accept-Pay', `ngn+paycrest+${facilitatorUrl}/v1`)
        .json({
            name: "x402-NGN Facilitator",
            version: "1.0.0",
            x402Version: 1,
            status: "live",
            description: "x402 V1 compliant facilitator for Nigerian Naira payments via Paycrest",
            schemes: ["ngn+paycrest"],
            networks: ["base"],
            endpoints: {
                supported: `${facilitatorUrl}/supported`,
                verify: `${facilitatorUrl}/verify`,
                settle: `${facilitatorUrl}/settle`,
                webhook: `${facilitatorUrl}/webhook`
            },
            documentation: "https://github.com/paycrest/x402-ngn-facilitator"
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` x402-NGN Facilitator v1.0.0`);
    console.log(` Running at http://localhost:${PORT}`);
    console.log(` x402 V1 Protocol Compliant`);
    console.log(` Scheme: ngn+paycrest on Base`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /           - Discovery & health check`);
    console.log(`  GET  /supported  - List supported schemes`);
    console.log(`  POST /verify     - Verify payment payload`);
    console.log(`  POST /settle     - Execute payment settlement`);
    console.log(`  POST /webhook    - Paycrest callback handler`);
});

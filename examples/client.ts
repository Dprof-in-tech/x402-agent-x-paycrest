import axios from 'axios';
import { PaymentPayload } from '../src/types';
import { createPaymentIntent } from '../src/schemes/ngn-paycrest';

/**
 * x402 V1 Compliant Client
 * 
 * This demonstrates how a client (wallet/agent) interacts with x402 resources:
 * 1. Request resource
 * 2. Receive 402 with payment requirements
 * 3. Create payment payload
 * 4. Send request with X-PAYMENT header
 * 5. Receive resource with X-PAYMENT-RESPONSE
 */

const RESOURCE_SERVER_URL = process.env.RESOURCE_SERVER_URL || 'http://localhost:4000';

async function payForWeather() {
    console.log('  Requesting weather data...\n');

    try {
        // Step 1: Request the resource (expect 402)
        const response = await axios.get(`${RESOURCE_SERVER_URL}/api/weather`);
        console.log(' Got weather data:', response.data);
    } catch (error: any) {
        if (error.response && error.response.status === 402) {
            console.log(' Payment Required (402 status received)');

            const paymentRequired = error.response.data;
            console.log('\nPayment Requirements:');
            console.log(JSON.stringify(paymentRequired, null, 2));

            // Step 2: Select payment method (first one in accepts array)
            const requirements = paymentRequired.accepts[0];
            console.log(`\n Cost: ₦${Number(requirements.maxAmountRequired) / 100}`);
            console.log(` Scheme: ${requirements.scheme}`);
            console.log(` Network: ${requirements.network}`);

            // Step 3: Create payment intent using the scheme
            console.log('\n Creating payment intent...');
            const paymentIntent = await createPaymentIntent(
                Number(requirements.maxAmountRequired) / 100, // Convert kobo to NGN
                requirements.payTo,
                requirements.extra?.bank || 'palmpay',
                requirements.extra?.accountName || 'Merchant'
            );

            console.log('payment intent', paymentIntent);

            console.log('\n Payment Intent Created:');
            console.log(`  Order ID: ${paymentIntent.orderId}`);
            console.log(`  Deposit Address: ${paymentIntent.depositAddress}`);
            console.log(`  USDC Amount: ${paymentIntent.sendAmount}`);
            console.log(`  Expires: ${new Date(paymentIntent.expiresAt).toISOString()}`);

            // Step 4: Create X-PAYMENT header
            const paymentPayload: PaymentPayload = {
                x402Version: 1,
                scheme: 'ngn+paycrest',
                network: 'base',
                payload: paymentIntent
            };

            const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
            console.log('\n Payment Header (base64):', paymentHeader.substring(0, 50) + '...');

            // Step 5: Simulate sending USDC to the deposit address
            console.log(`\n SIMULATING: Sending ${paymentIntent.sendAmount} USDC to ${paymentIntent.depositAddress} on Base...`);
            console.log('   (In production, this would be a real blockchain transaction)');

            // Wait a bit to simulate transaction time
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(' Transaction confirmed (simulated)');

            // Step 6: Retry the request with payment header
            console.log('\n Retrying request with payment proof...');
            const paidResponse = await axios.get(`${RESOURCE_SERVER_URL}/api/weather`, {
                headers: {
                    'X-PAYMENT': paymentHeader
                }
            });

            // Step 7: Success! We got the resource
            console.log('\n Payment accepted! Weather data received:');
            console.log(JSON.stringify(paidResponse.data, null, 2));

            // Check for settlement response
            const settlementHeader = paidResponse.headers['x-payment-response'];
            if (settlementHeader) {
                const settlement = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
                console.log('\n Settlement Proof:');
                console.log(`  Transaction: ${settlement.txHash}`);
                console.log(`  Network: ${settlement.networkId}`);
            }

        } else {
            console.error(' Unexpected error:', error.message);
        }
    }
}

async function payElectricityBill() {
    const meterNumber = '9115375399';
    const amountNGN = 5500; // ₦5,500

    console.log(`\n Paying electricity bill for meter ${meterNumber}...`);
    console.log(` Amount: ₦${amountNGN}\n`);

    try {
        // Step 1: Request the resource (expect 402)
        await axios.post(`${RESOURCE_SERVER_URL}/api/electricity`, {
            meterNumber: meterNumber,
            amount: amountNGN * 100 // Convert to kobo
        });
    } catch (error: any) {
        if (error.response && error.response.status === 402) {
            console.log(' Payment Required (402 status received)');

            const paymentRequired = error.response.data;
            const requirements = paymentRequired.accepts[0];

            console.log(`\n Cost: ₦${Number(requirements.maxAmountRequired) / 100}`);
            console.log(` Meter: ${requirements.payTo}`);

            // Step 2: Create payment intent
            console.log('\n Creating payment intent...');
            const paymentIntent = await createPaymentIntent(
                Number(requirements.maxAmountRequired) / 100,
                requirements.payTo, // Meter number
                requirements.extra?.bank || 'palmpay',
                requirements.extra?.accountName || 'Merchant'
            );

            console.log('\n Payment Intent Created:');
            console.log(`  Order ID: ${paymentIntent.orderId}`);
            console.log(`  USDC Amount: ${paymentIntent.sendAmount}`);

            // Step 3: Create payment payload
            const paymentPayload: PaymentPayload = {
                x402Version: 1,
                scheme: 'ngn+paycrest',
                network: 'base',
                payload: paymentIntent
            };

            const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

            // Step 4: Simulate crypto transfer
            console.log(`\n SIMULATING: Sending ${paymentIntent.sendAmount} USDC...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(' Transaction confirmed (simulated)');

            // Step 5: Retry with payment
            console.log('\n Retrying request with payment proof...');
            const paidResponse = await axios.post(
                `${RESOURCE_SERVER_URL}/api/electricity`,
                {
                    meterNumber: meterNumber,
                    amount: amountNGN * 100
                },
                {
                    headers: {
                        'X-PAYMENT': paymentHeader
                    }
                }
            );

            console.log('\n Payment successful! Bill paid:');
            console.log(JSON.stringify(paidResponse.data, null, 2));

            const settlementHeader = paidResponse.headers['x-payment-response'];
            if (settlementHeader) {
                const settlement = JSON.parse(Buffer.from(settlementHeader, 'base64').toString('utf-8'));
                console.log('\n Settlement Proof:');
                console.log(`  Reference: ${settlement.txHash}`);
            }

        } else {
            console.error(' Unexpected error:', error.message);
        }
    }
}

// Run examples
async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   x402 V1 Protocol Client Demo                        ║');
    console.log('║   Scheme: ngn+paycrest on Base                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Example 1: Pay for weather data
        await payForWeather();

        console.log('\n' + '═'.repeat(60) + '\n');

        // Example 2: Pay electricity bill
        await payElectricityBill();

        console.log('\n' + '═'.repeat(60));
        console.log(' All examples completed successfully!');
    } catch (error: any) {
        console.error('\n Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

main();

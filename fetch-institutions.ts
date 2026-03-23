import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const api = axios.create({
    baseURL: process.env.PAYCREST_API_URL || 'https://api.paycrest.io/v1',
    headers: {
        'API-Key': process.env.PAYCREST_API_KEY,
        'Content-Type': 'application/json'
    }
});

async function fetchInstitutions() {
    try {
        console.log("Fetching institutions...");
        const res = await api.get('/institutions/NGN');
        const banks = res.data.data;

        const palmpay = banks.find((b: any) => b.name.toLowerCase().includes('palm'));
        console.log("Found Palmpay:", palmpay);

        if (!palmpay) {
            console.log("Palmpay not found. Listing first 5 banks:");
            console.log(banks.slice(0, 5));
        }
    } catch (error: any) {
        console.error("Error fetching institutions:", error.response?.data || error.message);
    }
}

fetchInstitutions();

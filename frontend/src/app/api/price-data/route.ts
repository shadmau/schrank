import { NextResponse } from 'next/server';
import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const collectionAddress = searchParams.get('collectionAddress');
    const timeframe = searchParams.get('timeframe');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Validate required parameters
    if (!collectionAddress || !timeframe || !from || !to) {
        return NextResponse.json({ error: 'Missing required query parameters.' }, { status: 400 });
    }

    if (!backendUrl) {
        console.error('Backend URL is not configured');
        return NextResponse.json({ error: 'Backend URL is not configured' }, { status: 500 });
    }

    try {
        const fullUrl = `${backendUrl}/api/price-data?collectionAddress=${collectionAddress}&timeframe=${timeframe}&from=${from}&to=${to}`;
        console.log('Attempting to fetch from:', fullUrl);

        const response = await axios.get(fullUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });

        // Return the data received from the backend
        return NextResponse.json(response.data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error fetching price data:', error);
        return NextResponse.json({ error: 'Error fetching price data' }, { status: 500 });
    }
}
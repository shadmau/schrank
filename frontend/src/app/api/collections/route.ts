import { NextResponse } from 'next/server';
import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const dynamic = 'force-dynamic';

export async function GET() {
    // console.log('API route hit: /api/collections');
    // console.log('Backend URL:', backendUrl);

    if (!backendUrl) {
        console.error('Backend URL is not configured');
        return NextResponse.json({ error: 'Backend URL is not configured' }, { status: 500 });
    }

    try {
        const timestamp = new Date().getTime();
        const fullUrl = `${backendUrl}/api/collections?t=${timestamp}`;
        console.log('Attempting to fetch from:', fullUrl);

        const response = await axios.get(fullUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });

        // console.log('Response received:', response.status);
        // console.log('Data received from backend:', JSON.stringify(response.data, null, 2));

        return NextResponse.json(response.data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Error fetching collections' }, { status: 500 });
    }
}
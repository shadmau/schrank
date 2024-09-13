import { NextResponse } from 'next/server';
import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
export const dynamic = 'force-dynamic';

export async function GET() {
    if (!backendUrl) {
        return NextResponse.json({ error: 'Backend URL is not configured' }, { status: 500 });
    }

    try {
        const fullUrl = `${backendUrl}/api/collections/floor-price-history`;
        console.log('Attempting to fetch from:', fullUrl);
        const response = await axios.get(fullUrl);

        return NextResponse.json(response.data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('Error fetching floor price history:', error);
        return NextResponse.json({ error: 'Error fetching floor price history' }, { status: 500 });
    }
}
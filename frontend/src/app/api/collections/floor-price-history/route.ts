import { NextResponse } from 'next/server';
import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!backendUrl) {
        return NextResponse.json({ error: 'Backend URL is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');

    const validRanges = ['24h', '7d', '30d'];
    if (range && !validRanges.includes(range.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid range parameter. Must be one of: 24h, 7d, 30d.' }, { status: 400 });
    }

    const fullUrl = new URL(`${backendUrl}/api/collections/floor-price-history`);
    if (range) {
        fullUrl.searchParams.append('range', range.toLowerCase());
    }
    console.log('Attempting to fetch from:', fullUrl.toString());

    try {
        const response = await axios.get(fullUrl.toString());

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
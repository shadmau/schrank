import { NextResponse } from 'next/server';
import axios from 'axios';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET() {
    if (!backendUrl) {
        return NextResponse.json({ error: 'Backend URL is not configured' }, { status: 500 });
    }

    try {
        const response = await axios.get(`${backendUrl}/api/collections`);
        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Error fetching collections' }, { status: 500 });
    }
}

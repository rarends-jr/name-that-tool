import { NextResponse } from "next/server";
import { MongoClient } from 'mongodb';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    //delete a room

    return NextResponse.json({  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    //fetch a specific room

    return NextResponse.json({  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

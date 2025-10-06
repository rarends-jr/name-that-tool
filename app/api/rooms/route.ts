import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    //create a room

    return NextResponse.json({  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    //fetch all rooms

    return NextResponse.json({  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
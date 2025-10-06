import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";

export async function POST(req: Request) {
  await dbConnect();

  try {
    const room = await Room.create(req.body);
    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  await dbConnect();

  try {
    const rooms = await Room.find({});
    return NextResponse.json({ success: true, data: rooms }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
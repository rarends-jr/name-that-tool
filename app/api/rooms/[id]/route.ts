import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();

  try {
    const room = await Room.findById(params.id);
    if (!room) {
      return NextResponse.json({ success: false }, { status: 404 });
    }else{
      return NextResponse.json({ success: true, data: room }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  
  try {
    const room = await Room.deleteOne({ _id: params.id });
    if (!room.deletedCount) {
      return NextResponse.json({ success: false }, { status: 404 });
    }else{
      return NextResponse.json({ success: true, data: {} }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

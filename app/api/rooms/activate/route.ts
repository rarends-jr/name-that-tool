import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
//retrieves one random inactivate room and activates it
export async function POST(req: Request) {
  await dbConnect();
  try {
    let rooms = await Room.aggregate([
      { $match: {active: false} },
      { $sample: {size: 1} },
    ]);
    console.log(`Found an inactive room.`);
    if (rooms.length === 1){
      const room = await Room.findById(rooms[0]._id);
      await room.activate();

      return NextResponse.json({ success: true, data: room }, { status: 201 });
    }else{
      return NextResponse.json({ error: "No Rooms Available" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
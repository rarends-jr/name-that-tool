import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";

//retrieves one random inactivate room and activates it
export async function POST(req: Request) {
  await dbConnect();
  try {
    let room = await Room.aggregate([
      { $match: {active: false} },
      { $sample: {size: 1} },
    ]);
    if (room.length === 1){
      console.log(room[0]);
      let now = new Date();
      let oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await Room.collection.updateOne({ _id: room[0]._id}, { $set: { active: true, last_polled: now, expiry_time: oneDay } });

      return NextResponse.json({ success: true, data: room[0] }, { status: 201 });
    }else{
      return NextResponse.json({ error: "No Rooms Available" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
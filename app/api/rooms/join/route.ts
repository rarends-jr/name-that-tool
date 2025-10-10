import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Player from "@/models/Player";

export async function POST(req: Request) {
  await dbConnect();
  try {
    let json = await req.json();
    let rooms = await Room.find({ code: json.code, active: true });
    let room = rooms.length > 0 ? rooms[0] : null;
    if (room){
      let matchingPlayers = await Player.find({room: room._id, name: json.name});
      let player = null;;
      if (matchingPlayers.length <= 0){
        player = await Player.create({ 
          room: room._id,
          name: json.name,
          last_polled: new Date(),
          responses: [],
        });
        return NextResponse.json({ success: true, data: room }, { status: 201 });
      }else{
        player = matchingPlayers[0];
        let oneSecondAgo = new Date(new Date().getTime() - 1000);
        if (player.last_polled < oneSecondAgo){//name is now free, take it
          player.last_polled = new Date();
          await player.save();
          return NextResponse.json({ success: true, data: room }, { status: 201 });
        }else{
          return NextResponse.json({ error: "Name Taken" }, { status: 401 });
        }
      }
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
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
      if (matchingPlayers.length > 0){
        let player = matchingPlayers[0];
        await Player.deleteOne({ _id: player._id });
        room.players = room.players.filter((p: { _id: any; }) => p._id !== player._id);
        room.save();
        return NextResponse.json({ success: true, data: room }, { status: 201 });
      }
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
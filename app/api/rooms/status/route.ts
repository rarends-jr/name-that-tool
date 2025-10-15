import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import "@/models/Room_Round";
import Room from "@/models/Room";
import "@/models/Round";
import "@/models/Room_Question";
import "@/models/Player";
import "@/models/Question";
import "@/models/Response";
import redisConnect from "@/lib/redisConnect";

export async function POST(req: Request) {
  await dbConnect();
  try {
    let json = await req.json();
    let rooms = await Room.find({ code: json.code, active: true });
    let room = rooms.length > 0 ? rooms[0] : null;
    if (room){
      room.status = json.status;
      room.save();
      return NextResponse.json({ success: true, data: room }, { status: 200 });
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const role = searchParams.get('role');
    const mPlayerName = searchParams.get('playerName');
    if (!code) {
      return NextResponse.json({ error: "Missing room code" }, { status: 400 });
    }

    const client = await redisConnect();
    if (role === "player" && mPlayerName) {
      await client.hSet(`room:${code}_player:${mPlayerName}`, 'last_polled', new Date().toISOString());
    }
    const status = await client.hGetAll(`room:${code}`);
    if (!status || Object.keys(status).length === 0) {
      await client.quit();
      return NextResponse.json({ error: "Room Not Found" }, { status: 404 });
    }
    const playerNames = JSON.parse(status.playerNames || "[]");
    const playerStatus: any[] = [];
    for (const playerName of playerNames) {
      if (role === "host" || mPlayerName === playerName) {
        const playerData = await client.hGetAll(`room:${code}_player:${playerName}`);
        playerData.active = new Date(playerData.last_polled) > new Date(new Date().getTime() - 2000) ? "1" : "0";
        playerStatus.push(playerData);
      }
    }

    let resStatus = {
      players: playerStatus,
      status: status.status,
      state_timer: status.state_timer,
      state_max: status.state_max,
      round_name: status.round_name,
      round_intro_text: status.round_intro_text,
      round_intro_audio: status.round_intro_audio,
      round_intro_length: status.round_intro_length,
      round_outro_text: status.round_outro_text,
      round_outro_audio: status.round_outro_audio,
      round_outro_length: status.round_outro_length,
      question_image: status.question_image,
      room_question_id: status.room_question_id,
      room_round_id: status.room_round_id,
    };
    return NextResponse.json({ success: true, data: resStatus }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Response from "@/models/Response";
import Room from "@/models/Room";
import Player from "@/models/Player";
import Room_Question from "@/models/Room_Question";

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
        let roomQuestion = await Room_Question.findOne({ _id: json.room_question_id });
        if (roomQuestion) {
          let response = await Response.create({
            player: player._id,
            room_question: roomQuestion._id,
            answer: json.answer,
          });
          player.responses.push(response);
          player.save();
          roomQuestion.responses.push(response);  
          roomQuestion.save();
          return NextResponse.json({ success: true, data: room }, { status: 201 });
        }else{
        return NextResponse.json({ error: "Question Not Found" }, { status: 401 });
        }
      }else{
        return NextResponse.json({ error: "Player Not Found" }, { status: 401 });  
      }
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Response from "@/models/Response";
import Room from "@/models/Room";
import Player from "@/models/Player";
import Room_Question from "@/models/Room_Question";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

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
        let roomQuestion = await Room_Question.findById(json.room_question_id).populate('question');
        if (roomQuestion) {

          let response = await Response.create({
            player: player._id,
            room_question: roomQuestion._id,
            response: json.answer,
          });
          player.responses.push(response);
          await player.save();
          roomQuestion.responses.push(response);
          await roomQuestion.save();

          const message = `You are playing a game called Name That Tool. The question is "${roomQuestion.question.answer}". The player answered "${json.answer}". As an expert on tools, give this answer a score from 1 to 10 based on how well it matches the question. Only respond with the numeric score.`;
          console.log("AI Message:", message);
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [{ role: "user", content: message }],
          });
          console.log("AI Response:", aiResponse);
          let score = parseInt(aiResponse.choices[0].message.content ?? "-1");
          response.match_score = isNaN(score) ? -1 : Math.min(score, 10);
          await response.save();

          return NextResponse.json({ success: true, data: response }, { status: 201 });
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
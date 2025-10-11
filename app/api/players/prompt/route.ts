import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Player from "@/models/Player";
import Room_Round from "@/models/Room_Round";
import "@/models/Round";
import Room_Question from "@/models/Room_Question";
import Question from "@/models/Question";
import OpenAI from "openai";
import { getQuestionImage } from "@/scripts/getQuestionImage";

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
        let roomRound = await Room_Round.findById(json.room_round_id).populate('round');
        if (roomRound && roomRound.round && roomRound.round.user_submitted_questions) {
          const message = `You are playing a game called Name That Tool. The player is submitting a tool to be guessed by other players. their prompt is "${json.tool_name}". As an expert on tools, give this prompt a score from 1 to 10 based on how well it qualifies as a tool. Only respond with the numeric score.`;
          console.log("Message to AI:", message);
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [{ role: "user", content: message }],
          });
          console.log("AI Response:", aiResponse);
          let toolScore = parseInt(aiResponse.choices[0].message.content ?? "-1");
          if (isNaN(toolScore) || toolScore < 7) {
            return NextResponse.json({ error: `Your submission "${json.tool_name}" is not a tool.` }, { status: 401 });
          }else{
            let question = await Question.create({ 
              round: roomRound.round,
              creator: player, 
              image_url: '', 
              tool_name: json.tool_name
            });
            await getQuestionImage(question); 
            let roomQuestion = await Room_Question.create({
              room_round: roomRound,
              question: question,
              responses: []
            });
            roomRound.room_questions.push(roomQuestion);
            roomRound.save();
            roomRound.round.questions.push(question);
            roomRound.round.save();
          }
          return NextResponse.json({ success: true, data: room }, { status: 201 });
        }else{
          return NextResponse.json({ error: "Round not found or does not accept user prompts" }, { status: 401 });
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
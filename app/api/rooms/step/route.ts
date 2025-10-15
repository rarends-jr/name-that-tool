import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";

export async function POST(req: Request) {
  await dbConnect();
  try {
    let json = await req.json();
    let rooms = await Room.find({ code: json.code, active: true })
                        .populate({ 
                            path: 'room_rounds', 
                            populate: [
                                { 
                                    path: 'room_questions', 
                                    populate: [
                                        { path: 'responses' },
                                        { 
                                            path: 'question', 
                                            populate: { path: 'creator' } 
                                        }
                                    ]
                                },
                                {
                                    path: 'round', 
                                    populate: { 
                                        path: 'questions', 
                                        populate: { path: 'creator' } 
                                    } 
                                } 
                            ] 
                        })
                        .populate({ 
                            path: 'current_round', 
                            populate: [
                                { path: 'room_questions' },
                                { path: 'round' }
                            ] 
                        })
                        .populate({ 
                            path: 'current_question', 
                            populate: [
                                { 
                                    path: 'responses', 
                                    populate: { path: 'player' } 
                                },
                                { path: 'question' }
                         ]
                        })
                        .populate({ 
                            path: 'players', 
                            populate: { 
                                path: 'responses', 
                                populate: { 
                                    path: 'room_question', 
                                    populate: [
                                        {
                                            path: 'question', 
                                            populate: { path: 'creator' } 
                                        },
                                        { 
                                            path: 'room_round', 
                                            populate: { path: 'round' } 
                                        } 
                                    ]
                                } 
                            } 
                        });
    let room = rooms.length > 0 ? rooms[0] : null;
    if (room){
      await room.runGameTick();
      await room.putGameStatus();
      return NextResponse.json({ success: true }, { status: 200 });
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

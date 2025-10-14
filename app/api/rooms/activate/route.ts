import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import shuffle from "@/lib/shuffle";
import Room from "@/models/Room";
import Response from "@/models/Response";
import Room_Question from "@/models/Room_Question";
import Room_Round from "@/models/Room_Round";
import Player from "@/models/Player";
import Round from "@/models/Round";
import Question from "@/models/Question";

//retrieves one random inactivate room and activates it
export async function POST(req: Request) {
  await dbConnect();
  try {
    let rooms = await Room.aggregate([
      { $match: {active: false} },
      { $sample: {size: 1} },
    ]);
    console.log(`Found ${rooms.length} inactive rooms.`);
    if (rooms.length === 1){
      const room = await Room.findById(rooms[0]._id).populate({ path: "room_rounds", populate: [{ path: "round" }, { path: "room_questions" }] });
      console.log(`Activating room with code ${room?.code}`);
      //clear out anything that might be left over from a previous game
      for (const rr of room.room_rounds){
        for (const rq of rr.room_questions){
          console.log(`Clearing responses for question ${rq._id} in room ${room.code}`);
          await Response.deleteMany({ room_question: rq._id });
          if (rr.round.user_submitted_questions) {
            console.log(`Deleting user submitted question ${rq.question} in room ${room.code}`);
            await Question.findByIdAndDelete(rq.question);
          }
        }
        console.log(`Clearing room questions for room_round ${rr._id} in room ${room.code}`);
        await Room_Question.deleteMany({ room_round: rr._id });
      }
      console.log(`Clearing room rounds for room ${room.code}`);
      await Room_Round.deleteMany({ room: room._id });
      console.log(`Clearing players for room ${room.code}`);
      await Player.deleteMany({ room: room._id });

      room.room_rounds = [];
      room.players = [];

      let rounds = await Round.find({});
      console.log(`Found ${rounds.length} rounds.`);
      let questions = await Question.find({});
      console.log(`Found ${questions.length} questions.`);
      for(const round of rounds){
          console.log(`Processing round ${round.name} for room ${room.code}`);
          let room_round = await Room_Round.create({
              round: round,
              room: room._id,
              room_questions: [],
          });
          room.room_rounds.push(room_round);

          let roundQuestions = questions.filter(q => q.round.toString() === round._id.toString());
          if (round.user_submitted_questions || roundQuestions.length === 0) continue;
          shuffle(roundQuestions);
          roundQuestions.length = 8; // limit to 8 questions per round

          let order = 0;
          for (const question of roundQuestions) {
              console.log(`Adding question ${question._id} to room ${room.code}, round ${round.name}`);
              let room_question = await Room_Question.create({
                  room_round: room_round._id,
                  question: question,
                  order: order,
                  responses: [],
              });
              room_round.room_questions.push(room_question);
              order++;
          }
          await room_round.save();
      }

      console.log(`Saving room ${room.code}`);
      let now = new Date();
      let oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      room.active = true;
      room.last_polled = now;
      room.expiry_time = oneDay;
      await room.save();

      return NextResponse.json({ success: true, data: room }, { status: 201 });
    }else{
      return NextResponse.json({ error: "No Rooms Available" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";

export async function GET(req: Request) {
  await dbConnect();
  try {
    let json: Record<string, any> = { active: true};

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (code) {
       json.code = code;
    }
    const role = searchParams.get('role');
    //I feel like loading all the players takes extra processing time we don't need to spend for player polls.
    const rooms = //(role === 'host')? 
                  await Room.find(json)
                            .populate({ path: 'current_round', populate: {path: 'round'} })
                            .populate({ path: 'current_question', populate: {path: 'question'} })
                            .populate({ path: 'players', populate: { path: 'responses', populate: { path: 'room_question', populate: { path: 'room_round', populate: { path: 'round' } } } } })
                  //           : 
                  // await Room.find(json)
                  //           .populate({ path: 'current_round', populate: {path: 'round'} })
                  //           .populate({ path: 'current_question', populate: {path: 'question'} })
                  ;
    if (rooms.length === 1){
      const room = rooms[0];
      let onePlayer = room.players;
      let player:Player = null;
      const playerName = searchParams.get('playerName');
      if (role === 'host'){
        room.last_polled = new Date();
        room.save();
      }else if (playerName){
        onePlayer = room.players.filter({name: playerName});
        if (onePlayer.length === 1){
          let player = onePlayer[0];
          player.last_polled = new Date();
          player.save()
        }
      }
      let res: { 
        players?: any; 
        status?: string; 
        state_timer?: number; 
        round_intro_text?: string; 
        round_intro_audio?: string;
        round_intro_length?: number;
        round_outro_text?: string; 
        round_outro_audio?: string;
        round_outro_length?: number; 
        question_image?: string; 
      } = {
        players: [],
        status: room.status,
        state_timer: room.state_timer
      };

      switch (room.status) {
        case "start_requested":
          //nothing special
          break;
        case "starting_game":
          //nothing special
          break;
        case "introducing_game":
          //nothing special
          break;
        case "starting_round":
          res.round_intro_text = room.current_round.round.intro_text;
          res.round_intro_audio = room.current_round.round.intro_audio;
          res.round_intro_length = room.current_round.round.intro_length;
          break;
        case "asking_questions":
          res.question_image = room.current_question.question.imageUrl;
          if (role === 'host'){
            for (const player of room.players) {
              let response = player.responses.filter({room_question: room.current_question._id});
              let responded = false;
              if (response.length > 0){
                responded = response.match_score > 0;
              }
              let resPlayer = {
                name: player.name,
                priority: player.priority,
                active: player.last_polled > new Date(new Date().getTime() - 1000),
                responded: responded,
              };
              res.players.push(resPlayer);
            }
          }else{
            if (player){
              let response = player.responses.filter({room_question: room.current_question._id});
              let responded = false;
              if (response.length > 0){
                responded = response.match_score > 0;
              }
              let resPlayer = {
                name: player.name,
                priority: player.priority,
                active: true,
                responded: player.response.match_score > 0,
              };
              res.players.push(resPlayer);
            }
          }
          break;
        case "ending_round":
          res.round_outro_text = room.current_round.round.outro_text;
          res.round_outro_audio = room.current_round.round.outro_audio;
          res.round_outro_length = room.current_round.round.outro_length;
          if (role === 'host'){
            for (const player of room.players) {
              let score = 0;
              for (const response of player.responses) {
                score += response.room_question.room_round.round.point_value;
              }
              let resPlayer = {
                name: player.name,
                priority: player.priority,
                active: player.last_polled > new Date(new Date().getTime() - 1000),
                score: score,
              };
              res.players.push(resPlayer);
            }
          }
          break;
        case "ending_game":
          if (role === 'host'){
            for (const player of room.players) {
              let score = 0;
              for (const response of player.responses) {
                score += response.room_question.room_round.round.point_value;
              }
              let resPlayer = {
                name: player.name,
                priority: player.priority,
                active: player.last_polled > new Date(new Date().getTime() - 1000),
                score: score,
              };
              res.players.push(resPlayer);
            }
          }
          break;
      }
      return NextResponse.json({ success: true, data: res }, { status: 200 }); 
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 404 });
    }
    // // Generate CSRF token and set cookie
    // const csrfToken = generateCsrfToken();
    // const res = NextResponse.json({ success: true, data: rooms, csrfToken }, { status: 200 });
    // setCookie(res, "csrfToken", csrfToken);
    // return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
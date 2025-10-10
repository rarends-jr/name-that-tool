
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Round from "@/models/Round";
import Question from "@/models/Question";

let end = 0;
let start = 0;
setInterval(async () => {
  let startDate = new Date();//if we've drifted past the 0 millisecond mark, reset to it so each rounds occurs on the second mark
  startDate.setMilliseconds(0);
  start = startDate.getTime();
  await dbConnect();
  
  const rounds = await Round.find({options:{sort:{order:1}}}).populate({path:"questions", options:{sort:{order:1}}});
  const rooms = await Room.find({active: true})
                          .populate({
                                path: 'current_round',
                                populate: {
                                    path: 'questions',
                                }
                            })
                          .populate({
                                path: 'current_question',
                                populate: {
                                    path: 'responses',
                                    populate: {
                                        path: 'player',
                                    }
                                }
                            })
                          .populate({
                                path: 'players',
                                populate: {
                                    path: 'responses',
                                    populate: {
                                        path: 'question',
                                        populate: {
                                            path: 'round',
                                        }
                                    }
                                }
                            });
  rooms.forEach(room => {
    switch (room.status) {
        case "start_requested":
            room.state_timer = 10; //10 second countdown to game start
            room.status = "starting_game";
            room.current_round = null;
            room.current_question = null;
            room.save();
            break;
        case "starting_game":
            if (room.state_timer <= 0){
                room.status = "introducing_game";
                room.state_timer = 35; //35 second game introduction period
            }else{
                room.state_timer--;
            }
            room.save();
            break;
        case "introducing_game":
            if (room.state_timer <= 0){
                room.status = "starting_round";
                room.current_round = rounds[0];
                room.state_timer = room.current_round.intro_length; //round introduction period
            }else{
                room.state_timer--;
            }
            room.save();
            break;
        case "starting_round":
            //show text / play a sound bite explaining the rules
            if (room.state_timer <= 0){
                room.status = "asking_questions";
                room.state_timer = 20; //20 second question timer
                room.current_question = room.questions[0];
            }else{
                room.state_timer--;
            }
            room.save();
            break;
        case "asking_questions":
            let hasEveryoneResponded = false;
            if (room.state_timer <= 0 || hasEveryoneResponded){
                let subsequentQuestions = room.current_round.questions.filter((q: InstanceType<typeof Question>) => q.order > room.current_question.order);
                if (subsequentQuestions.length > 0){
                    room.state_timer = 20; //20 second question timer
                    room.current_question = subsequentQuestions[0];
                }else{
                    if (room.current_round.outro_length > 0){
                        room.state_timer = room.current_round.outro_length + 2 * room.players.length; //10 second base + 2 seconds per player to review round results
                    }
                    room.status = "ending_round";//if there's no outro, round end only take 1 second
                }
            }else{
                room.state_timer--;
            }
            room.save();
            break;
        case "ending_round":
            if (room.state_timer <= 0){
                let subsequentRounds = rounds.filter((r: InstanceType<typeof Round>) => r.order > room.current_round.order);
                if (subsequentRounds.length > 0){
                    room.status = "starting_round";
                    room.current_round = subsequentRounds[0];
                    room.state_timer = room.current_round.intro_length; //round introduction period
                    room.current_question = null;
                }else{
                    room.status = "ending_game";
                    room.state_timer = 60 + 2 * room.players.length; //60 second base + 3 seconds per player to review game results
                }
            }else{
                room.state_timer--;
            }
            room.save();
            break;
    }
  });

  end = new Date().getTime();
}, 1000 - (end - start));
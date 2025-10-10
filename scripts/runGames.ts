import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Player from "@/models/Player";
import Room_Round from "@/models/Room_Round";
import Round from "@/models/Round";
import Room_Question from "@/models/Room_Question";
import Question from "@/models/Question";
import Response from "@/models/Response";

async function runGameTick() {
    await dbConnect();

    const rooms = await Room.find({active: true})
        .populate({ path: 'room_rounds', populate: { path: 'room_questions' } })
        .populate({ path: 'current_round', populate: { path: 'questions' } })
        .populate({ path: 'current_question', populate: { path: 'responses', populate: { path: 'player' } } })
        .populate({ path: 'players', populate: { path: 'responses', populate: { path: 'question', populate: { path: 'round' } } } });

    console.log(`Running game tick for ${rooms.length} active rooms at ${new Date().toLocaleString()}`);
    rooms.forEach(room => {
        console.log(`Room ${room.code} status: ${room.status}, state_timer: ${room.state_timer}`);
        switch (room.status) {
            case "start_requested":
                room.state_timer = 10;
                room.status = "starting_game";
                room.current_round = null;
                room.current_question = null;
                room.save();
                break;
            case "starting_game":
                if (room.state_timer <= 0) {
                    room.status = "introducing_game";
                    room.state_timer = 35;
                } else {
                    room.state_timer--;
                }
                room.save();
                break;
            case "introducing_game":
                if (room.state_timer <= 0) {
                    room.status = "starting_round";
                    room.current_round = room.room_rounds[0];
                    room.state_timer = room.current_round.intro_length;
                } else {
                    room.state_timer--;
                }
                room.save();
                break;
            case "starting_round":
                if (room.state_timer <= 0) {
                    room.status = "asking_questions";
                    room.state_timer = 20;
                    room.current_question = room.current_round.room_questions[0];
                } else {
                    room.state_timer--;
                }
                room.save();
                break;
            case "asking_questions":
                let hasEveryoneResponded = true;
                room.players.forEach((player: InstanceType<typeof Player>) => {
                    if (room.currentQuestion.respnoses.filter((r: InstanceType<typeof Response>) => r.player._id.equals(player._id) && r.match_score > 0).length === 0) {
                        hasEveryoneResponded = false;
                    }
                });
                if (room.state_timer <= 0 || hasEveryoneResponded) {
                    let subsequentQuestions = room.current_round.room_questions.filter((q: InstanceType<typeof Room_Question>) => q.order > room.current_question.order);
                    if (subsequentQuestions.length > 0) {
                        room.state_timer = 20;
                        room.current_question = subsequentQuestions[0];
                    } else {
                        if (room.current_round.round.outro_length > 0) {
                            room.state_timer = room.current_round.round.outro_length + 2 * room.players.length;
                        }
                        room.status = "ending_round";
                    }
                } else {
                    room.state_timer--;
                }
                room.save();
                break;
            case "ending_round":
                if (room.state_timer <= 0) {
                    let subsequentRounds = room.room_rounds.filter((r: InstanceType<typeof Room_Round>) => r.round.order > room.current_round.round.order);
                    if (subsequentRounds.length > 0) {
                        room.status = "starting_round";
                        room.current_round = subsequentRounds[0];
                        room.state_timer = room.current_round.round.intro_length;
                        room.current_question = null;
                    } else {
                        room.status = "ending_game";
                        room.state_timer = 60 + 2 * room.players.length;
                    }
                } else {
                    room.state_timer--;
                }
                room.save();
                break;
            case "ending_game":
                break;
        }
    });
}

export function runGames(){
    console.log("Begin Running games for one minute at: " + new Date().toLocaleString());
    let secondsElapsed = 0;
    const intervalId = setInterval(async () => {
        let start = new Date().getTime();
        await runGameTick();
        let end = new Date().getTime();
        console.log("Tick duration (ms): " + (end - start));
        secondsElapsed++;
        if (secondsElapsed >= 60) {
            clearInterval(intervalId);
            console.log("End running games for one minute at: " + new Date().toLocaleString());
        }
    }, 1000);
}

runGames();
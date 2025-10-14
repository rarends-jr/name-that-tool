import dbConnect from "@/lib/dbConnect";
import shuffle from "@/lib/shuffle";
import "@/models/Room_Round";
import Room_Round from "@/models/Room_Round";
import Room from "@/models/Room";
import "@/models/Round";
import "@/models/Room_Question";
import Room_Question from "@/models/Room_Question";
import "@/models/Player";
import "@/models/Question";
import Response from "@/models/Response";
import "@/models/Response";
import Player from "@/models/Player";
import Question from "@/models/Question";
import { ObjectId } from "mongodb";

async function runGameTick() {
    await dbConnect();

    const rooms = await Room.find({active: true})
        .populate({ path: 'room_rounds', populate: [{ path: 'room_questions', populate: { path: 'responses' } },{ path: 'round' }] })
        .populate({ path: 'current_round', populate: [{ path: 'room_questions' },{ path: 'round' }] })
        .populate({ path: 'current_question', populate: { path: 'responses', populate: { path: 'player' } } })
        .populate({ path: 'players', populate: { path: 'responses', populate: { path: 'room_question', populate: { path: 'room_round', populate: { path: 'round' } } } } });

    console.log(`Running game tick for ${rooms.length} active rooms at ${new Date().toLocaleString()}`);
    rooms.forEach(async room => {
        console.log(`Room ${room.code} status: ${room.status}, state_timer: ${room.state_timer}`);
        switch (room.status) {
            case "start_requested":
                //clear out custom questions from previous games
                for (const roomRound of room.room_rounds) {
                    if (roomRound.room.user_submitted_questions) {
                        for (const roomQuestion of roomRound.room_questions) {
                            await Response.deleteMany({ room_question: roomQuestion._id });
                            await Question.findByIdAndDelete(roomQuestion.question_id);
                            await Room_Question.findByIdAndDelete(roomQuestion._id);
                        }
                        roomRound.room_questions = [];
                        await roomRound.save();
                    }
                }
                //clear out custom responses from previous games
                for (const roomRound of room.room_rounds) {
                    for (const roomQuestion of roomRound.room_questions) {
                        // roomQuestion.responses = [];
                        // await roomQuestion.save();

                        await Response.deleteMany({ room_question: roomQuestion._id });
                    }
                }

                for (const player of room.players) {
                    player.responses = [];
                    await player.save();
                }
                
                room.state_timer = 10;
                room.state_max = 10;
                room.status = "starting_game";
                room.current_round = null;
                room.current_question = null;
                await room.save();
                break;
            case "starting_game":
                if (room.state_timer <= 0) {
                    room.status = "introducing_game";
                    room.state_timer = 35;
                    room.state_max = 35;
                } else {
                    room.state_timer--;
                }
                await room.save();
                break;
            case "introducing_game":
                if (room.state_timer <= 0) {
                    room.status = "starting_round";
                    room.current_round = room.room_rounds[0];
                    room.state_timer = room.current_round.round.intro_length;
                    room.state_max = room.current_round.round.intro_length;
                } else {
                    room.state_timer--;
                }
                await room.save();
                break;
            case "starting_round":
                if (room.state_timer <= 0) {
                    if (room.current_round.round.user_submitted_questions) {
                        Room_Question.deleteMany({ room_round: room.current_round._id });
                        room.status = "prompting_questions";
                        room.state_timer = 60;
                        room.state_max = 60;
                    }else{
                        room.status = "asking_questions";
                        room.state_timer = 20;
                        room.state_max = 20;
                        room.current_question = room.current_round.room_questions[0];
                    }
                } else {
                    room.state_timer--;
                }
                await room.save();
                break;
            case "prompting_questions":
                let hasEveryonePrompted = true;
                room.players.forEach((player: InstanceType<typeof Player>) => {
                    if (room.current_round.room_questions.filter((r: InstanceType<typeof Room_Question>) => r.creator && r.creator._id.equals(player._id) && r.tool_score > 7).length === 0) {
                        hasEveryonePrompted = false;
                    }
                });
                if (room.state_timer <= 0 || hasEveryonePrompted) {
                    if (room.current_round.room_questions.length === 0) {
                        if (room.current_round.round.outro_length > 0) {
                            room.state_timer = room.current_round.round.outro_length + 2 * room.players.length;
                            room.state_max = room.current_round.round.outro_length + 2 * room.players.length;
                        }
                        room.status = "ending_round";
                    }else{
                        shuffle(room.current_round.room_questions);
                        let index = 0;
                        for (const room_question of room.current_round.room_questions) {
                            room_question.order = index;
                            index++;
                            await room_question.save();
                        }
                        await room.save();
                        room.status = "asking_questions";
                        room.state_timer = 20;
                        room.state_max = 20;
                        room.current_question = room.current_round.room_questions[0];
                    }
                } else {
                    room.state_timer--;
                }
                await room.save();
                break;
            case "asking_questions":
                let hasEveryoneResponded = true;
                room.players.forEach((player: InstanceType<typeof Player>) => {
                    if (room.current_question && (!room.current_question.question.creator || !room.current_question.question.creator._id.equals(player._id)) && room.current_question.responses.filter((r: InstanceType<typeof Response>) => r.player._id.equals(player._id) && r.match_score > 0).length === 0) {
                        hasEveryoneResponded = false;
                    }
                });
                if (!room.current_question || room.state_timer <= 0 || hasEveryoneResponded) {
                    let subsequentQuestions = room.current_round.room_questions.filter((q: InstanceType<typeof Room_Question>) => q.order > room.current_question.order);
                    if (subsequentQuestions.length > 0) {
                        room.state_timer = 20;
                        room.state_max = 20;
                        room.current_question = subsequentQuestions[0];
                    } else {
                        if (room.current_round.round.outro_length > 0) {
                            room.state_timer = room.current_round.round.outro_length + 2 * room.players.length;
                            room.state_max = room.current_round.round.outro_length + 2 * room.players.length;
                        }
                        room.status = "ending_round";
                    }
                } else {
                    room.state_timer--;
                }
                await room.save();
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
                await room.save();
                break;
            case "ending_game":
                if (room.state_timer <= 0) {
                    room.status = "waiting";
                }else{
                    room.state_timer--;
                }
                await room.save();
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
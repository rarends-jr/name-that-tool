// models/Room.ts
import mongoose from 'mongoose';
import Response from './Response';
import Question from './Question';
import Room_Question from './Room_Question';
import Room_Round from './Room_Round';
import Player from './Player';
import Round from './Round';
import shuffle from "@/lib/shuffle";
import redisConnect from '@/lib/redisConnect';

const RoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Room code required.'],
    maxlength: [4, 'Code cannot be more than 4 characters'],
    unique: true,
  },
  status: {//waiting-not started, active-in progress & host connected, paused-in progress, host disconnected,finished-game over
    type: String,
    default: "waiting",
  },
  state_timer: {//counts down seconds remaining in current state
    type: Number,
    default: -1,
  },
  state_max: {//counts down seconds remaining in current state
    type: Number,
    default: -1,
  },
  room_rounds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Round',
  }],
  current_round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Round',
      default: null,
  },
  current_question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Question',
      default: null,
  },
  active: {//true if a game has been started in this room
    type: Boolean,
    default: false,
  },
  expiry_time: {
    type: Date,
    required: [true, 'Please provide an expiry date.'],
  },
  last_polled: {
    type: Date,
  },
  players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
  }],
}, {
  timestamps: true,
});

interface IRoom extends mongoose.Document {
  code: string;
  room_rounds: any[];
  players: any[];
  _id: mongoose.Types.ObjectId;
  active: boolean;
  last_polled: Date;
  expiry_time: Date;
  status: string;
  state_timer: number;
  state_max: number;
  current_round: any;
  current_question: any;
  save: () => Promise<any>;
  populate: (arg: any) => Promise<any>;
}

RoomSchema.method('activate', async function(this: IRoom, deletePlayers: boolean = true) {
    console.log(`Activating room with code ${this.code}`);
    await this.populate({ path: "room_rounds", populate: [{ path: "round" }, { path: "room_questions" }] });
    //clear out anything that might be left over from a previous game
    for (const rr of this.room_rounds){
      for (const rq of rr.room_questions){
        console.log(`Clearing responses for question ${rq._id} in room ${this.code}`);
        await Response.deleteMany({ room_question: rq._id });
        if (rr.round.user_submitted_questions) {
          console.log(`Deleting user submitted question ${rq.question} in room ${this.code}`);
          await Question.findByIdAndDelete(rq.question);
        }
      }
      console.log(`Clearing room questions for room_round ${rr._id} in room ${this.code}`);
      await Room_Question.deleteMany({ room_round: rr._id });
    }
    console.log(`Clearing room rounds for room ${this.code}`);
    await Room_Round.deleteMany({ room: this._id });
    this.room_rounds = [];

    if (deletePlayers) {
      console.log(`Clearing players for room ${this.code}`);
      await Player.deleteMany({ room: this._id });
    this.players = [];
    }else{
      console.log(`Not clearing players for room ${this.code}`);
    }

    let rounds = await Round.find({});
    console.log(`Found ${rounds.length} rounds.`);
    let questions = await Question.find({});
    console.log(`Found ${questions.length} questions.`);
    for(const round of rounds){
        console.log(`Processing round ${round.name} for room ${this.code}`);
        let room_round = await Room_Round.create({
            round: round,
            room: this._id,
            room_questions: [],
        });
        this.room_rounds.push(room_round);

        let roundQuestions = questions.filter(q => q.round.toString() === round._id.toString());
        if (round.user_submitted_questions || roundQuestions.length === 0) continue;
        shuffle(roundQuestions);
        roundQuestions.length = 8; // limit to 8 questions per round

        let order = 0;
        for (const question of roundQuestions) {
            console.log(`Adding question ${question._id} to room ${this.code}, round ${round.name}`);
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

    console.log(`Saving room ${this.code}`);
    let now = new Date();
    let oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.active = true;
    this.last_polled = now;
    this.expiry_time = oneDay;
    this.active = true;
    this.status = "waiting";
    this.state_timer = -1;
    this.state_max = -1;
    this.current_round = null;
    this.current_question = null;
    await this.save();
});

RoomSchema.method('runGameTick', async function(this: IRoom) {
    console.log(`Room ${this.code} status: ${this.status}, state_timer: ${this.state_timer}`);
    this.last_polled = new Date();
    switch (this.status) {
        case "start_requested":            
            this.state_timer = 10;
            this.state_max = 10;
            this.status = "starting_game";
            this.current_round = null;
            this.current_question = null;
            break;
        case "starting_game":
            if (this.state_timer <= 0) {
                this.status = "introducing_game";
                this.state_timer = 35;
                this.state_max = 35;
            } else {
                this.state_timer--;
            }
            break;
        case "introducing_game":
            if (this.state_timer <= 0) {
                this.status = "starting_round";
                this.current_round = this.room_rounds[0];
                this.state_timer = this.current_round.round.intro_length;
                this.state_max = this.current_round.round.intro_length;
            } else {
                this.state_timer--;
            }
            break;
        case "starting_round":
            if (this.state_timer <= 0) {
                if (this.current_round.round.user_submitted_questions) {
                    Room_Question.deleteMany({ room_round: this.current_round._id });
                    this.status = "prompting_questions";
                    this.state_timer = 60;
                    this.state_max = 60;
                }else{
                    this.status = "asking_questions";
                    this.state_timer = 20;
                    this.state_max = 20;
                    this.current_question = this.current_round.room_questions[0];
                }
            } else {
                this.state_timer--;
            }
            break;
        case "prompting_questions":
            let hasEveryonePrompted = true;
            this.players.forEach((player: InstanceType<typeof Player>) => {
                if (this.current_round.room_questions.filter((r: InstanceType<typeof Room_Question>) => r.creator && r.creator._id.equals(player._id) && r.tool_score > 7).length === 0) {
                    hasEveryonePrompted = false;
                }
            });
            if (this.state_timer <= 0 || hasEveryonePrompted) {
                if (this.current_round.room_questions.length === 0) {
                    if (this.current_round.round.outro_length > 0) {
                        this.state_timer = this.current_round.round.outro_length + 2 * this.players.length;
                        this.state_max = this.current_round.round.outro_length + 2 * this.players.length;
                    }
                    this.status = "ending_round";
                }else{
                    shuffle(this.current_round.room_questions);
                    let index = 0;
                    for (const room_question of this.current_round.room_questions) {
                        room_question.order = index;
                        index++;
                        await room_question.save();
                    }
                    await this.save();
                    this.status = "asking_questions";
                    this.state_timer = 20;
                    this.state_max = 20;
                    this.current_question = this.current_round.room_questions[0];
                }
            } else {
                this.state_timer--;
            }
            break;
        case "asking_questions":
            let hasEveryoneResponded = true;
            // console.log('Players:', this.players);
            this.players.forEach((player: InstanceType<typeof Player>) => {
                if (this.current_question && (!this.current_question.question.creator || !this.current_question.question.creator._id.equals(player._id)) && this.current_question.responses.filter((r: InstanceType<typeof Response>) => r.player._id.equals(player._id) && r.match_score > 0).length === 0) {
                    hasEveryoneResponded = false;
                }
            });
            // console.log('Current Question:', this.current_question);
            if (!this.current_question || this.state_timer <= 0 || hasEveryoneResponded) {
                let subsequentQuestions = this.current_round.room_questions.filter((q: InstanceType<typeof Room_Question>) => q.order > this.current_question.order);
                if (subsequentQuestions.length > 0) {
                    this.state_timer = 20;
                    this.state_max = 20;
                    this.current_question = subsequentQuestions[0];
                } else {
                    if (this.current_round.round.outro_length > 0) {
                        this.state_timer = this.current_round.round.outro_length + 2 * this.players.length;
                        this.state_max = this.current_round.round.outro_length + 2 * this.players.length;
                    }
                    this.status = "ending_round";
                }
            } else {
                this.state_timer--;
            }
            break;
        case "ending_round":
            if (this.state_timer <= 0) {
                let subsequentRounds = this.room_rounds.filter((r: InstanceType<typeof Room_Round>) => r.round.order > this.current_round.round.order);
                if (subsequentRounds.length > 0) {
                    this.status = "starting_round";
                    this.current_round = subsequentRounds[0];
                    this.state_timer = this.current_round.round.intro_length;
                    this.current_question = null;
                } else {
                    this.status = "ending_game";
                    this.state_timer = 60 + 2 * this.players.length;
                }
            } else {
                this.state_timer--;
            }
            break;
        case "ending_game":
            if (this.state_timer <= 0) {
                this.status = "waiting";
            }else{
                this.state_timer--;
            }
            break;
    }
    console.log(`Saving Room ${this.code} new status: ${this.status}, state_timer: ${this.state_timer}`);
    await this.save();
});

RoomSchema.method('putGameStatus', async function(this: IRoom) {
    let status = {
        playerNames: JSON.stringify(this.players.map(player => player.name)),
        status: this.status,
        state_timer: this.state_timer,
        state_max: this.state_max,
        round_name: this.current_round?.round?.name??"",
        round_intro_text: this.current_round?.round?.intro_text??"",
        round_intro_audio: this.current_round?.round?.intro_audio??"",
        round_intro_length: this.current_round?.round?.intro_length??"",
        round_outro_text: this.current_round?.round?.outro_text??"",
        round_outro_audio: this.current_round?.round?.outro_audio??"",
        round_outro_length: this.current_round?.round?.outro_length??"",
        question_image: this.current_question?.question?.imageUrl??"",
        room_question_id: this.current_question?._id.toString()??"",
        room_round_id: this.current_round?._id.toString()??"",
    };

    // console.log('connecting to redis');
    const client = await redisConnect();
    // console.log('setting room status in redis: ', status);
    await client.hSet(`room:${this.code}`, status);
    await client.expire(`room:${this.code}`, 60); // expire in one minute
    
    let playerStatus: any[] = [];
    for (const player of this.players) {
      let score = 0;
      for (const response of player.responses) {
        if (response.match_score >= 7){
          score += response.room_question.room_round.round.point_value;  
        }
      }
      console.log(`Player ${player.name} has base score of ${score}`);
      for (const roomRound of this.room_rounds.filter(rr => rr.round?.user_submitted_questions)) {//for each round that uses user submitted questions...
        for (const roomQuestion of roomRound.room_questions.filter((rq: any) => rq.question?.creator?._id.equals(player._id))) {//and for each questions in that round that this player created...
          let stumpScore = 0;
          let didAnybodyGetIt = false;
          //To ensure everybody tries to submit a question, you get the same amount of points as everybody who gets it right
          score += roomRound.round.point_value;
          for (const otherPlayer of this.players.filter((p: any) => !p._id.equals(player._id))){//for each other player...
            let responses = otherPlayer.responses.filter((r: any) => r.room_question?._id.equals(roomQuestion._id));//for this question...
            if (responses.length >= 1 && responses[0].match_score >= 7){
              didAnybodyGetIt = true;
            }else{
              stumpScore += roomRound.round.point_value / 2;
            }
          }
          console.log(`didAnybodyGetIt for player ${player.name} on question ${roomQuestion._id}: ${didAnybodyGetIt}, stumpScore: ${stumpScore}`);
          //and if at least one player got it right, you get half points for each player who didn't
          score += didAnybodyGetIt ? stumpScore : 0;
        }
      }
      console.log(`Player ${player.name} has score (after bonus) of ${score}`);
      let resPlayer = {
        name: player.name,
        priority: player.priority? 1 : 0,
        //do not set active or last_polled here, those are stored in redis
        score: score,
        match_score: -1,
        prompt_match_score: -1,
      };
      if (this.current_question){
        if (this.current_question.question && this.current_question.question.creator && this.current_question.question.creator._id.equals(player._id)){
          resPlayer.match_score = 11;
        }else{
          let responses = player.responses.filter((r: any) => r.room_question._id.equals(this.current_question._id));
          if (responses.length > 0){
            resPlayer.match_score = responses[0].match_score;
          }else{
            // console.log(`No response found for player ${player.name} on current question ${this.current_question._id}`);
          }
        }
      }

      if (this.current_round && this.current_round.round.user_submitted_questions){
        let roomQuestion = this.current_round.room_questions.find((rq: any) => rq.question && rq.question.creator && rq.question.creator._id.equals(player._id));
        if (roomQuestion) {
          resPlayer.prompt_match_score = 10;//if the question is inserted, it matches
        }
      }
      playerStatus.push(resPlayer);
      
      await client.hSet(`room:${this.code}_player:${player.name}`, resPlayer);
      await client.expire(`room:${this.code}_player:${player.name}`, 60); // expire in one minute
    }

    let statusRes = {
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
    // console.log(`returning status:`,  statusRes);
    return statusRes;
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
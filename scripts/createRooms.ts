import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Round from "@/models/Round";
import Room_Round from "@/models/Room_Round";
import Question from "@/models/Question";
import Room_Question from "@/models/Room_Question";


async function main() {
    await dbConnect();
    await Room.deleteMany({});
    await Room_Round.deleteMany({});
    await Room_Question.deleteMany({});

    const chars = ['DFCKST', 'UIOTCH', 'CKSUIOT', 'DFCKSTH'];
    let lastLog = Date.now();     
    let rounds = await Round.find({});
    let questions = await Question.find({});


    let codes:string[] = [];
    for (let index = 0; index < 10; index++) {
        let newCode;
        do{
            newCode = chars[0][Math.floor(Math.random() * chars[0].length)] +
                chars[1][Math.floor(Math.random() * chars[1].length)] +
                chars[2][Math.floor(Math.random() * chars[2].length)] +
                chars[3][Math.floor(Math.random() * chars[3].length)];
        }while(codes.includes(newCode));
        
        codes.push(
            chars[0][Math.floor(Math.random() * chars[0].length)] +
            chars[1][Math.floor(Math.random() * chars[1].length)] +
            chars[2][Math.floor(Math.random() * chars[2].length)] +
            chars[3][Math.floor(Math.random() * chars[3].length)]
        );
    }

    for (const code of codes){
        console.log(`Creating room with code ${code}`);
        if ((Date.now() - lastLog) / 1000 > 0) {
            lastLog = Date.now();
        }
        
        let room = await Room.create({
            code: code,
            expiry_time: 0,
            active: false,
            room_rounds: [],
            players: [],
        });

        for(const round of rounds){
            console.log(`Processing round ${round.name} for room ${room.code}`);
            let room_round = await Room_Round.create({
                round: round,
                room: room,
                room_questions: [],
            });
            room.room_rounds.push(room_round);

            let roundQuestions = questions.filter(q => q.round.toString() === round._id.toString());
            if (roundQuestions.length === 0) continue;
            shuffle(roundQuestions);
            roundQuestions.length = 8; // limit to 8 questions per round

            let order = 0;
            for (const question of roundQuestions) {
                console.log(`Adding question ${question._id} to room ${room.code}, round ${round.name}`);
                let room_question = await Room_Question.create({
                    room_round: room_round,
                    question: question,
                    order: order,
                    responses: [],
                });
                room_round.room_questions.push(room_question);
                order++;
            }
            await room_round.save();
        }
        await room.save();
    }
    
    process.exit(0);
}

function shuffle<T>(array: Array<T>) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

main();
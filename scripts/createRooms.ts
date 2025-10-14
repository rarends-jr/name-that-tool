import dbConnect from "@/lib/dbConnect";
import shuffle from "@/lib/shuffle";
import Room from "@/models/Room";
import Round from "@/models/Round";
import Room_Round from "@/models/Room_Round";
import Question from "@/models/Question";
import Room_Question from "@/models/Room_Question";
import Player from "@/models/Player";

function getAllCombos(arr: string[]): string[] {
    if (arr.length === 0) return [];//empty array means no combos.

    let res: string[] = [];
    for (const char of arr[0]) {
        if (arr.length === 1) {//we're at the last array, return the values as individual chars
            res.push(char);
        } else {//take the current array and combine it with all the combos from the rest of the arrays
            for (const suffix of getAllCombos(arr.slice(1))) {
                res.push(char + suffix);
            }
        }
    }
    return res;
}

async function main() {
    await dbConnect();
    await Room.deleteMany({});
    await Room_Round.deleteMany({});
    await Room_Question.deleteMany({});
    await Player.deleteMany({});
    let rounds = await Round.find({user_submitted_questions: true});
    for (const round of rounds) {
        await Question.deleteMany({round: round._id});
    }

    const chars = ['DFCKST', 'UIOTCH', 'CKSUIOT', 'DFCKSTH'];
    
    let codes = getAllCombos(chars);
    console.log(`Generated ${codes.length} possible room codes.`);
    shuffle(codes);
    codes.length = 200; // limit to 200 rooms

    let rooms = [];
    for (const code of codes){
        console.log(`Creating room with code ${code}`);
        
        rooms.push({
            code: code,
            expiry_time: 0,
            active: false,
            room_rounds: [],
            players: [],
        });
    }
    await Room.insertMany(rooms);
    
    process.exit(0);
}

main();
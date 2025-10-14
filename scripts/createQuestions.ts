import dbConnect from "@/lib/dbConnect";
import Question from "@/models/Question";
import Round from "@/models/Round";

async function main() {
    await dbConnect();
    await Question.deleteMany({});
    
    let toolData = {
        round1:{
            id: '68ee75edcf1ffc2667070443',
            tools: [
                'Claw Hammer',
                'Flathead Screwdriver',
                'Phillips screwdriver',
                'Adjustable Wrench',
                'Pliers',
                'Tape measure',
                'Level',
                'Utility knife',
                'Handsaw',
                'Power drill',
                'Sandpaper',
                'Socket set',
                'Allen wrench',
                'Flashlight',
                'Ladder',
                'Paintbrush',
                'Chisel',
                'Stud finder',
                'Extension cord',
                'Safety goggles',
                'Sledgehammer',
                'Clamps',
                'Table Saw',
                'Electrical Tape',
            ],
            celebs: [
                'Kevin Sorbo',
                'Rosanne Barr',
                'Mike Lindell',
                'Kanye West',
                'Kellyanne Conway',
            ],
        },
        round2:{
            id: '68ee75edcf1ffc2667070444',
            tools: [
                'Micrometer',
                'Vernier caliper',
                'Torque wrench',
                'Oscilloscope',
                'Dial indicator',
                'Tap and die set',
                'Feeler gauge',
                'Bore gauge',
                'Multimeter clamp meter',
                'Soldering iron',
                'Pipe threader',
                'Cable Crimping tool',
                'gear/bearing puller set',
                'Laser level',
                'Wood Planer',
                'Reamer',
                'Heat gun',
                'Rivet gun',
                'Thickness planer',
                'Hydraulic press',
                'Impact Driver',
                'Hammer Drill',
                'Welding Mask',
                'Bagger 288',
            ],
            celebs: [
                'Maynard James Keenan',
                'Adam Jones',
                'Danny Carey',
                'Justin Chancellor',
                'Paul D\'Amour',
            ],
        },
    };
    for (const [key, value] of Object.entries(toolData)) {
        let round = await Round.findById(value.id);
        let questions = [];
        for (const toolName of value.tools) {
            let newQuestion = new Question({
                round: round,
                imageUrl: '',
                answer: toolName,
                type: 'tool',
            });
            questions.push(newQuestion);
            await newQuestion.save();
            round.questions.push(newQuestion);
        }
        for (const toolName of value.celebs) {
            let newQuestion = new Question({
                round: round,
                imageUrl: '',
                answer: toolName,
                type: 'celeb',
            });
            questions.push(newQuestion);
            await newQuestion.save();
            round.questions.push(newQuestion);
        }
        await round.save();
    }
    
    process.exit(0);
}

main();
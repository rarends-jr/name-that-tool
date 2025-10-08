import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import { now } from "mongoose";


async function main() {
    await dbConnect();
    await Room.deleteMany({});
    const chars = 'DOFUCKSHIT';//fuck, shit, dick, suck, and cock are all covered
    let lastLog = Date.now(); 
    let index = 0;
    let max = chars.length * chars.length * chars.length * chars.length;
    for (let i = 0; i < chars.length; i++) {
        for (let j = 0; j < chars.length; j++) {
            let rooms = [];
            for (let k = 0; k < chars.length; k++) {
                for (let l = 0; l < chars.length; l++) {
                    index++;
                    if ((Date.now() - lastLog) / 1000 > 0) {
                        lastLog = Date.now();
                        console.log(`${new Date(lastLog).toLocaleString()} - Progress: ${index}/${max} (${(index / max).toLocaleString('en-US', {style: 'percent'})})`);
                    }
                    rooms.push({
                        code: `${chars[i]}${chars[j]}${chars[k]}${chars[l]}`,
                        expiry_time: 0,
                        active: false,
                    });
                }
            } 
            //insert rooms 10*10 (100) at a time
            await Room.create(rooms, { ordered: true });
        } 
    }
    
    process.exit(0);
}

main();
import dbConnect from "@/lib/dbConnect";
import Question from "@/models/Question";
import { getQuestionImage } from "./getQuestionImage";

async function main() {
    await dbConnect();
    let questions = await Question.find({imageUrl: {$in: [null, '']}});
    console.log(`Found ${questions.length} questions to process.`);
    for (const question of questions) {
        await getQuestionImage(question);
    }
    
    process.exit(0);
}
main();
import Question from "@/models/Question";

// Configure the S3 client with your region and credentials
import { S3Client, PutObjectCommand }  from "@aws-sdk/client-s3";
const s3Client = new S3Client({
    region: "us-east-1", // e.g., "us-east-1"
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
            }
        }
        : {})
});

export async function getQuestionImage(question: InstanceType<typeof Question>) {
    console.log(`Processing question ${question._id} (${question.answer})`);
    let imageUrl = await getFirstImage(question.answer);
    if (imageUrl !== null) {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            await uploadFile('name-that-tool', `tool_images/${question._id}.jpg`, Buffer.from(imageBuffer));
            question.imageUrl = `https://name-that-tool.s3.amazonaws.com/tool_images/${question._id}.jpg`;
            question.save();
            console.log(`Updated question ${question._id} with image URL ${question.imageUrl}`);
        }else{
            console.log(`Failed to fetch image from URL: ${imageUrl} for question ${question._id} (${question.answer})`);
        }
    }else{
        console.log(`No image found for question ${question._id} (${question.answer})`);
    }
}

async function getFirstImage(query: String) {
    let result = null;
    try {
        let response = await fetch(`https://serpapi.com/search.json?engine=google_images&q=${query}&location=Austin,+TX,+Texas,+United+States
&api_key=${process.env.SERPAPI_KEY}`, { method: 'GET' , headers: { "Content-Type": "application/json", }, });

        let json = await response.json();

        if (json && json.images_results && json.images_results.length > 0) {
            const firstImage = json.images_results[0];
            console.log("First image title:", firstImage.title);
            console.log("First image source:", firstImage.source);
            console.log("First image URL:", firstImage.original); // URL of the original image
            result = firstImage.original;
        } else {
            console.log("No image results found for the query:", query);
            result = null;
        }
    } catch (error) {
        console.error("Error fetching image results:", error);
        result = null;
    }
    return result;
}

async function uploadFile(bucketName: string, key: string, body: Buffer) {
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
    });
    await s3Client.send(command);
    console.log(`File ${key} uploaded to ${bucketName}`);
}
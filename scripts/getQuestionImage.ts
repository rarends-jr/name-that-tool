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
    const imageBuffer = await getFirstImage(question.answer);
    if (imageBuffer) {
        await uploadFile('name-that-tool', `tool_images/${question._id}.jpg`, Buffer.from(imageBuffer));
        question.imageUrl = `https://name-that-tool.s3.amazonaws.com/tool_images/${question._id}.jpg`;
        question.save();
        console.log(`Updated question ${question._id} with image URL ${question.imageUrl}`);
    } else {
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
            for (const img of json.images_results) {
                console.log("Image title:", img.title);
                console.log("Image source:", img.source);
                console.log("Image URL:", img.original); // URL of the original image
                try{
                    const imageResponse = await fetch(img.original);
                    if (imageResponse.ok) {
                        console.log(`Successfully fetched image from URL: ${img.original} for query: ${query}`);
                        result = await imageResponse.arrayBuffer();
                        break; // Exit the loop after successfully fetching the first valid image
                    } else {
                        console.log(`Failed to fetch image from URL: ${img.original} for query: ${query}`);
                        result = null;
                    }
                }catch (error){
                    console.log(`Error fetching image from URL: ${img.original} for query: ${query}`, error);
                    result = null;
                }
            }            
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
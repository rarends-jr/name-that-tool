import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // This will run at build/startup time, not per-request
  throw new Error("❌ Missing OPENAI_API_KEY in environment variables");
}

const openai = new OpenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: message }],
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import React from "react";
import "@/models/Question";
import Round from "@/models/Round";
import dbConnect from "@/lib/dbConnect";

type Round = {
    _id: string;
    name: string;
    questions: Question[];
    user_submitted_questions: boolean;
    order: number;
    point_value: number;
}

type Question = {
    _id: string;
    answer: string;
    imageUrl?: string;
    type: string;
    creator?: string | null;
};

async function fetchRounds(): Promise<Round[]> {
    await dbConnect();
    return await Round.find({user_submitted_questions: false}).populate('questions').sort({order: 1});
}

export default async function QuestionsPage() {
    const rounds = await fetchRounds();

    return (
        <div>
            <h1>Questions Audit</h1>
            {rounds.map((round) => (
                <section key={round._id}>
                    <h2>{round.name}</h2>
                    <ul>
                        {round.questions.map((question) => (
                            <li key={question._id} style={{ marginBottom: "1em" }}>
                                <div>
                                    <strong>{question.answer}</strong>
                                </div>
                                {question.imageUrl && (
                                    <div>
                                        <img src={question.imageUrl} alt={`Image for ${question.answer}`} style={{ maxWidth: 200 }} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
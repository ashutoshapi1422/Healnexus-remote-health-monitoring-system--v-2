import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
}

async function listModelsDirectly() {
    try {
        console.log("Fetching models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.error(`API Request Failed: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error("Error details:", errorText);
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods?.join(", ")})`);
            });
        } else {
            console.log("No models found in response:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModelsDirectly();

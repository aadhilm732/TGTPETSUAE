import OpenAI from "openai";

export const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY,
    baseUrl:process.env.OPENAI_BASE_URL
});

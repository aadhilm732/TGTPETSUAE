import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ---- Gemini main logic ----
async function main(base64Image, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build the Gemini request body
  const body = {
    contents: [
      {
        parts: [
          {
            text: `
              You are a product listing assistant for TGTPEST UAE store.
              Your job is to analyze an image of a product and generate structured data.
              Respond ONLY with raw JSON (no markdown, no code block).
              The JSON must strictly follow this schema:
              {
                "name": string,
                "description": string
              }
            `,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image, // raw base64 string
            },
          },
        ],
      },
    ],
  };

  // Send request to Gemini API
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API Error:", errText);
    throw new Error(`Gemini API request failed (${response.status})`);
  }

  const data = await response.json();

  // Extract AI response text
  const raw =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    (() => {
      console.error("Unexpected Gemini response:", data);
      throw new Error("Invalid Gemini API response");
    })();

  // Clean and parse JSON
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse failed:", cleaned);
    throw new Error("Gemini did not return valid JSON");
  }
}

// ---- Next.js API Route ----
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isSeller = await authSeller(userId);

    if (!isSeller) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { base64Image, mimeType } = await request.json();

    if (!base64Image || !mimeType) {
      return NextResponse.json(
        { error: "Missing image data or mimeType" },
        { status: 400 }
      );
    }

    const result = await main(base64Image, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /store/ai route:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 400 }
    );
  }
}

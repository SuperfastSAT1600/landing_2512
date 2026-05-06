import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("Testing gemini-1.5-flash...");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const result = await model.generateContent("hello");
    console.log(result.response.text());
  } catch (err) {
    console.error(err.message);
  }
}

run();

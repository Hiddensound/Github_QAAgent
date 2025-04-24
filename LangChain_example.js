// Load environment variables first
import 'dotenv/config';

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Define the chat prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant. Please respond to the user's request only based on the given context."],
  ["user", "Question: {question}\nContext: {context}"],
]);

// Initialize the LLM model with your API key already pulled by dotenv
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  openAIApiKey: process.env.OPENAI_API_KEY, // ✅ Now explicitly passed!
});

// Set up output parsing
const outputParser = new StringOutputParser();

// Chain the prompt -> model -> output parser
const chain = prompt.pipe(model).pipe(outputParser);

// Main async function to run the chain
async function run() {
  const question = "Can you tell me how many types of animals are out there in this world?";
  const context = "Animals are four legged creatures which are not human.";

  const result = await chain.invoke({ question, context });

  console.log("AI Response:", result);
}

// Run it
run().catch(console.error);

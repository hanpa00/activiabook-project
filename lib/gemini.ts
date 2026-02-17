import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export interface JournalLineAI {
    account_id: string;
    debit: number;
    credit: number;
    line_description: string;
}

export interface JournalEntryAI {
    date: string;
    description: string;
    lines: JournalLineAI[];
}

export interface AIProcessingResult {
    entries: JournalEntryAI[];
}

export async function processCsvWithAI(
    csvData: string,
    chartOfAccounts: any[]
): Promise<AIProcessingResult> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
    You are an expert accountant. I will provide you with a CSV segment from a bank statement, credit card statement, or invoice, along with a list of available accounts from my Chart of Accounts.
    
    Your task is to:
    1. Analyze the CSV data.
    2. Map the transactions to the most appropriate account from the provided Chart of Accounts.
    3. Group transactions into balanced journal entries.
    4. Each journal entry must have at least two lines and the sum of debits must equal the sum of credits.
    5. If an entry does not balance based on the CSV data, add a balancing line using an account named "AI Balancing Account". If such an account doesn't exist in the list, use the most appropriate equity or expense account, but prefer a placeholder if possible. Actually, just create the line and I will handle mapping it to a real 'balancing' ID if needed, but for now, try to find a natural offset. If you must create a balancing line, use a null account_id or a placeholder string "BALANCING_REQUIRED" so I can identify it.
    6. Return the result in the following JSON format:
    {
      "entries": [
        {
          "date": "YYYY-MM-DD",
          "description": "General description of the transaction",
          "lines": [
            {
              "account_id": "the uuid of the account from the chart of accounts",
              "debit": 0,
              "credit": 0,
              "line_description": "Specific line description"
            }
          ]
        }
      ]
    }

    Chart of Accounts:
    ${JSON.stringify(chartOfAccounts, null, 2)}

    CSV Data (Top rows):
    ${csvData}

    Rules:
    - Only return the JSON. No preamble or explanation.
    - Dates must be in YYYY-MM-DD format.
    - If you are unsure of an account mapping, pick the best fit but mark the line description with "[CHECK]".
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText) as AIProcessingResult;
    } catch (error) {
        console.error("Failed to parse AI response:", text);
        throw new Error("AI failed to generate a valid response.");
    }
}

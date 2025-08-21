import { chatAboutPdf } from "./rag.js";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);
    const { docId, message, history = [] } = body;

    if (!docId || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "docId and message required" }),
      };
    }

    const response = await chatAboutPdf({ docId, message, history });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
}

import { getDocPages } from "./rag.js";

export async function handler(event) {
  try {
    const { docId } = event.queryStringParameters;
    if (!docId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "docId required" }),
      };
    }

    const pages = await getDocPages(docId);

    return {
      statusCode: 200,
      body: JSON.stringify(pages),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
}

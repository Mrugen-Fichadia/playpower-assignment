import { ensureIndexForDoc } from "./rag.js";
import multiparty from "multiparty";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Important: disable default parser
  },
};

export async function handler(event) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();

    form.parse(event, async (err, fields, files) => {
      if (err) {
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: err.message }),
        });
      }

      try {
        const docId = Date.now().toString();
        const file = files.file[0]; // FormData field name: "file"

        await ensureIndexForDoc({ docId, filePath: file.path });

        resolve({
          statusCode: 200,
          body: JSON.stringify({ docId }),
        });
      } catch (e) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: e.message }),
        });
      }
    });
  });
}

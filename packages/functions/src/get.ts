import { Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler: Handler = async (event) => {
  let importId = event.pathParameters?.importId;
  let importResp = null;
  let code = 500;
  let message = "";

  try {
    console.log("Validating request parameters");

    // check if the required import job id was provided in the URL
    if (importId) {
      // try to retrieve a response S3 object for the import job id
      importResp = await getImportJobResponse(importId);

      if (importResp) {
        code = 200;
        message = "Import job response found.";
      }
    } else {
      code = 400;
      message = `The request did not include a valid import job id in the url. Please review your request and try again later.`;
    }
  } catch (error) {
    console.error("Error handling the request:", error);

    // ignore the error if the S3 object was not found
    if (error.name === "NoSuchKey") {
      code = 404;
      message = `The requested import id is invalid or the import job has not yet been started/completed. Please review the provided import job id and try again later.`;
    } else {
      message = `Error handling the request.`;
    }
  }

  let body = { message, importId };
  
  console.log(message);

  if (importResp) body.report = importResp;

  return {
    headers: {
      "content-type": "application/json",
    },
    statusCode: code,
    body: JSON.stringify(body),
  };
};

/**
 * Gets an import job response object from S3 if it exists
 * @param importId - The import job id to locate the the S3 response object for.
 */
export const getImportJobResponse = async (importId: string) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: `response/${importId}`,
  };

  // Create the PutObjectCommand and send it
  const command = new GetObjectCommand(params);
  const response = await s3Client.send(command);

  // Read and parse the JSON data
  const data = await streamToString(response.Body as Readable);
  const jsonReport = JSON.parse(data);

  return jsonReport;
};

/**
 * Converts an object from S3 into a JSON string
 * @param stream - The object stream to convert.
 */
const streamToString = (stream: Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
};

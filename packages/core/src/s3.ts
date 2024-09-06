import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const DEBUG = process.env.DEBUG == "1";

/**
 * Saves a JSON array payload into S3 for async processing.
 * @param bucket - The S3 bucket to put the object into.
 * @param key - The S3 object key.
 * @param payload - The payload as a serialized JSON string for the object content.
 */
export const putObject = async (
  bucket: string,
  key: string,
  payload: string,
) => {
  const params = {
    Bucket: bucket,
    Key: key,
    Body: payload,
    ContentType: "application/json", 
  };

  const command = new PutObjectCommand(params);
  if (DEBUG) console.log(
    `Putting S3 object. Bucket ${params.Bucket} key ${params.Key}`,
  );
  await s3Client.send(command);

  return key;
};

/**
 * Gets an object from S3
 * @param bucket - The S3 bucket to load the request object from.
 * @param key - The S3 request object key.
 */
export const getObject = async (bucket: string, key: string) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };

  const command = new GetObjectCommand(params);
  const response = await s3Client.send(command);

  // read the S3 object as JSON data
  const data = await streamToString(response.Body as Readable);
  const requestPayload = JSON.parse(data);

  return requestPayload;
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

import { Handler } from "aws-lambda";
import crypto from "crypto";
import {
  ValidatedItem,
  GroupedErrors,
  validateEmployees,
} from "../../core/src/validation";
import { putObject } from "../../core/src/s3";

const DEBUG = process.env.DEBUG == "1";
const MAX_PER_REQ = process.env.MAX_PER_REQ;
const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler: Handler = async (event) => {
  let importId = null;
  let code = 500;
  let message = "";
  let validatedItems: ValidatedItem[] = [];
  let hasErrors: boolean = false;

  try {
    if (DEBUG) console.log("Validating request payload");

    const payload = JSON.parse(event.body);

    // only check if the payload has a valid JSON array and a valid element count
    if (
      Array.isArray(payload) &&
      payload.length > 0 &&
      payload.length <= MAX_PER_REQ
    ) {
      // parse all the JSON elements in the array and filter items with errors
      validatedItems = validateEmployees(payload, "errors");

      // check if any of the employee was not parsed successfully, only proceed if all the items had a valid employee
      hasErrors = validatedItems.some((item) => item.errors?.length);

      if (!hasErrors) {
        // generate an object key and save it to S3 for async processing
        const strPayload = JSON.stringify(payload);
        importId = generateGUID();

        await putObject(BUCKET_NAME, `request/${importId}`, strPayload);

        code = 202;
        message =
          "Import job request accepted. Processing will resume asynchronously";
      } else {
        code = 400;
        message = `The request payload contains at least one invalid employee item. Please review the error(s) and the corresponding item index(es), correct or remove the item(s) and try again.`;
      }
    } else {
      code = 400;
      message = `The request payload is not a valid JSON array, the array is empty or has more than ${MAX_PER_REQ} elements. Please review your request and try again.`;
    }
  } catch (error) {
    console.error("Error handling the request:", error);
    message = `Error handling the request.`;

    if (DEBUG) message += ` ${error}`;
  }

  let body = { message };

  if (!hasErrors) {
    if (importId) body.importId = importId;
    if (DEBUG) console.log("Request id", importId);
  } else {
    console.log("Errors detected");

    body.errors = validatedItems;
  }

  return {
    headers: {
      "content-type": "application/json",
    },
    statusCode: code,
    body: JSON.stringify(body),
  };
};

/**
 * Generates a unique key based on the payload and current date/time.
 * @param payload - The payload to hash
 * @returns a unique key for S3 object which combines both the hash and the current time
 */
function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
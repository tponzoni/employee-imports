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
        importId = generateUniqueKey(strPayload);

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

    // check if the header 'x-resp-group-by-index' is present, the default response groups by
    // error message and presents a list of indexes that have a specific error message
    if (event.headers["x-resp-group-by-error"]) {
      // summarize the errors for a shorter response payload that has less repetition
      const groupedErrors: GroupedErrors = {};

      validatedItems.forEach((item) => {
        item.errors?.forEach((error) => {
          if (!groupedErrors[error]) {
            groupedErrors[error] = [];
          }
          groupedErrors[error].push(item.index);
        });
      });

      body.errors = groupedErrors;
    } else {
      body.errors = validatedItems;
    }
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
export const generateUniqueKey = (payload: string): string => {
  
  const newGUID = generateGUID();
  return newGUID;
  // const newUUID: string = uuidv4();
  // console.log(newUUID);
  // const timestamp = new Date().toISOString(); // current date and time
  // const hash = crypto.createHash("sha256").update(payload).digest("hex"); // create hash
  // return `${hash}_${timestamp.replace(/[:.-]/g, "")}`; // create a unique key
};


function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const newGUID = generateGUID();
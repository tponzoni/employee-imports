import { Handler } from "aws-lambda";
import { getObject, putObject } from "../../core/src/s3";
import { transactWriteItems } from "../../core/src/ddb";
import {
  ValidatedItem,
  GroupedErrors,
  validateEmployees,
  Employee,
} from "../../core/src/validation";

const DEBUG = process.env.DEBUG == "1";
const MAX_TRANSACT_WRITE_BATCH = process.env.MAX_TRANSACT_WRITE_BATCH
  ? parseInt(process.env.MAX_TRANSACT_WRITE_BATCH)
  : 1;
const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

interface ImportReport {
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: ValidatedItem[];
}

/**
 * This handler receives S3 Event Notifications whenever an employee import request is saved
 * @param event - The JSON object from S3 Event Notification, containing a pointer to the request object that was just received.
 */
export const handler: Handler = async (event) => {
  // get the S3 object source details
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  const importId = key.replace("request/", "");

  let allItems: ValidatedItem[] = [];

  try {
    if (DEBUG)
      console.log(`Loading request object from Bucket ${bucket} Key ${key}`);

    // try to retrieve the import request object
    const payload = await getObject(bucket, key);

    if (payload) {
      // load all the items (errors and accepted) for a full report on the processing result
      allItems = validateEmployees(payload, "all");

      // process the import request and obtain a report
      const report = await processImportRequest(allItems);

      //console.log("report", report);

      if (report) {
        // save the processing report to an S3 response object
        await putObject(
          BUCKET_NAME,
          `response/${importId}`,
          JSON.stringify(report),
        );
        if (DEBUG) console.log("Import job completed successfully.");
      }
    }
  } catch (error) {
    console.error("Error handling the request:", error);

    // ignore the error if the S3 object was not found
    if (error.name === "NoSuchKey") {
      console.log(`The import job request object was not found in S3`);
    }
  }
};

/**
 * Parses each JSON element in an array as employee objects and puts items into DynamoDB in batches
 * @param items - The JSON object containing an array of employee objects.
 */
export const processImportRequest = async (
  items: ValidatedItem[],
): Promise<ImportReport> => {
  const report: ImportReport = {
    successCount: 0,
    failureCount: 0,
    processedCount: items.length,
    errors: []
  };

  // loop through all the provided items, executing multiple batch writes for the valid items and keeping track of the responses from DDB
  for (let i = 0; i < items.length; i += 1) {
    const validatedItem = items[i];

    if (validatedItem.errors?.length == 0) {
      // process each transaction individuall so we have a better incorrectness handling
      const transactResp = await transactWriteItems(TABLE_NAME, validatedItem);
      
      if (transactResp?.errors?.length > 0) {
        report.errors.push(validatedItem);
      } else {
        report.successCount += 1;
      }
    } else {
      report.errors.push(validatedItem);
    }
  }

  report.failureCount = report.errors.length;

  return report;
};

import { Handler } from "aws-lambda";
import { getObject, putObjectToS3 } from "../../core/src/s3";
import { batchWriteItemToDdb } from "../../core/src/ddb";
import {
  ValidatedItem,
  GroupedErrors,
  validateEmployees,
  Employee,
} from "../../core/src/validation";

const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

interface ImportReport {
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors?: ValidatedItem[];
}

/**
 * This handler receives S3 Event Notifications whenever an employee import request is saved
 * @param event - The JSON object from S3 Event Notification, containing a pointer to the request object that was just received.
 */
export const handler: Handler = async (event) => {
  // get the S3 object source details
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  
  let allItems: ValidatedItem[] = [];

  try {
    console.log(`Loading request object from Bucket ${bucket} Key ${key}`);

    // try to retrieve the import request object
    const payload = await getObject(bucket, key);

    if (payload) {
      // load all the items (errors and accepted) for a full report on the processing result
      allItems = validateEmployees(payload, "all");

      // process the import request and obtain a report
      const report = await processImportRequest(allItems);

      console.log("report", report);

      if (report) {
        // save the processing report to an S3 response object
        await putObjectToS3(
          BUCKET_NAME,
          `response/${key.replace("request/", "")}`,
          JSON.stringify(report),
        );
        console.log("Import job completed successfully.");
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
  };
  let validEmployeeItems: ValidatedItem[] = [];

  // loop through all the provided items, executing multiple batch writes for the valid items
  for (let i = 0; i < items.length; i += 1) {
    const validatedItem = items[i];

    if (validatedItem.employee) {
      validEmployeeItems.push(validatedItem);

      if (validEmployeeItems.length == 25 || i == items.length - 1) {
        const batchWriteResp = await batchWriteItemToDdb(
          TABLE_NAME,
          validEmployeeItems,
        );

        // reset the batch for the next call
        validEmployeeItems = [];
      }
    } else {
      report.failureCount += 1;
    }
  }

  report.processedCount = items.length;

  return report;
};

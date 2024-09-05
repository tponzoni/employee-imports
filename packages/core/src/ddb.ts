import {
  DynamoDBClient,
  BatchWriteItemCommand,
  BatchWriteItemCommandInput,
  WriteRequest,
} from "@aws-sdk/client-dynamodb";
import { ValidatedItem } from "./validation";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Writes a batch of employee items to the DynamoDB table
 * @param table - The DynamoDB table to batch put the items into.
 * @param validEmployeeItems - An array of valid employee JSON objects to be put into the table within a batch
 */
export const batchWriteItem = async (
  table: string,
  validEmployeeItems: ValidatedItem[],
) => {
  const putRequests: WriteRequest[] = [];

  // iterate over validEmployeeItems and create PutRequest objects
  validEmployeeItems.forEach((item) => {
    if (item.employee) {
      putRequests.push({
        PutRequest: {
          Item: {
            empNo: { S: item.employee.empNo },
            firstName: { S: item.employee.firstName },
            lastName: { S: item.employee.lastName },
            ...(item.employee?.phNo && { phNo: { S: item.employee.phNo } }), // add phNo only if it exists
          },
        },
      });
    }
  });

  const batchWriteInput: BatchWriteItemCommandInput = {
    RequestItems: {
      [table]: putRequests,
    },
  };

  // Execute the batch write operation
  const batchWriteResp = await executeBatchWrite(batchWriteInput);

  console.log("response", batchWriteResp);

  return batchWriteResp;
};

/**
 * Executes a batch write command with an array of employee items to the DynamoDB table
 * @param batchWriteInput - The BatchWriteItemCommandInput containing the PutRequests with Employee data
 */
async function executeBatchWrite(batchWriteInput: BatchWriteItemCommandInput) {
  let result = null;
  try {
    result = await dynamoDbClient.send(
      new BatchWriteItemCommand(batchWriteInput),
    );
    console.log("Batch write succeeded:", result);
  } catch (error) {
    console.error("Error during batch write:", error);
  }
}

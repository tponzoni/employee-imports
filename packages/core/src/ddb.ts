import {
  DynamoDBClient,
  WriteRequest,
  TransactWriteItem,
  TransactWriteItemsCommandInput,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { ValidatedItem } from "./validation";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Writes a batch of employee items to the DynamoDB table
 * @param item - A valid employee JSON item to be put into the table within a transaction
 */
export const transactWriteItems = async (
  table: string,
  item: ValidatedItem,
) => {
  const writeItems: TransactWriteItem[] = [];

  // iterate over validEmployeeItems and create PutRequest objects
  if (item.employee) {
    writeItems.push({
      Put: {
        TableName: table,
        Item: {
          PK: { S: `emp#${item.employee.PK}` },
          SK: { S: `emp#${item.employee.PK}` },
          whenModified: { S: item.employee.whenModified },
          empNo: { S: item.employee.empNo },
          firstName: { S: item.employee.firstName },
          lastName: { S: item.employee.lastName },
          ...(item.employee?.phNo && { phNo: { S: item.employee.phNo } }), // add phNo only if it exists
        },
        ConditionExpression:
          "attribute_not_exists(whenModified) OR whenModified < :whenModified",
        ExpressionAttributeValues: {
          ":whenModified": { S: item.employee.whenModified },
        },
      },
    });

    if (item.employee.phNo) {
      writeItems.push({
        Put: {
          TableName: table,
          Item: {
            PK: { S: `ph#${item.employee.phNo}` },
            SK: { S: `ph#${item.employee.phNo}` },
            whenModified: { S: item.employee.whenModified },
            empNo: { S: item.employee.empNo },
          },
          ConditionExpression:
            "attribute_not_exists(whenModified) OR (whenModified < :whenModified AND empNo = :empNo)",
          ExpressionAttributeValues: {
            ":whenModified": { S: item.employee.whenModified },
            ":empNo": { S: item.employee.empNo },
          },
        },
      });
    }
  }

  const input: TransactWriteItemsCommandInput = {
    TransactItems: writeItems,
  };

  //console.log("TransactWriteItemsCommandInput", input);

  // Execute the batch write operation
  try {
    // Execute the batch write operation
    const cmdResp = await dynamoDbClient.send(
      new TransactWriteItemsCommand(input),
    );
    return cmdResp;
  } catch (error) {
    if (error.name === "TransactionCanceledException") {
      // if only one reason returned, it means the item did not have phNo
      if (error.CancellationReasons.length > 0) {

        if (error.CancellationReasons[0].Code !== "None") {
          item.errors?.push(
            `Employee item recently updated.`,
          );
        }

        if (error.CancellationReasons.length == 2 && error.CancellationReasons[1].Code !== "None") {
          item.errors?.push(`Duplicate phNo value detected.`);
        }
      }

      return item;
    } else {
      console.log("error:", error);
      // Handle other errors if needed
      throw error;
    }
  }
};

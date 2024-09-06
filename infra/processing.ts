import { bucket, table } from "./storage";

// invoke the processing Lambda function whenever a JSON array payload is saved into S3
bucket.subscribe(
  {
    link: [bucket, table],
    handler: "packages/functions/src/processing.handler",
    memory: "2048 MB",
    timeout: "900 seconds",
    environment: {
      DEBUG: "0",
      MAX_TRANSACT_WRITE_BATCH: "1",
      BUCKET_NAME: bucket.name,
      TABLE_NAME: table.name
    },
  },
  {
    events: ["s3:ObjectCreated:*"],
    filterPrefix: "request/", // << requests are put into S3 to use event notification
  },
);

import { bucket } from "./storage";

export const api = new sst.aws.ApiGatewayV2("Api");

api.route("POST /employee-imports", {
  link: [bucket],
  handler: "packages/functions/src/post.handler",
  environment: {
    DEBUG: "1",
    MAX_PER_REQ: "10000",
    BUCKET_NAME: bucket.name
  }
});

api.route("GET /employee-imports/{importId}", {
  link: [bucket],
  handler: "packages/functions/src/get.handler",
  environment: {
    BUCKET_NAME: bucket.name
  }
});
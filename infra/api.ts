import { bucket } from "./storage";

export const api = new sst.aws.ApiGatewayV2("Api");

api.route("POST /", {
  link: [bucket],
  handler: "packages/functions/src/post.handler",
});
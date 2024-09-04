/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "Api": {
      "type": "sst.aws.ApiGatewayV2"
      "url": string
    }
    "EmployeeImport": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Employees": {
      "name": string
      "type": "sst.aws.Dynamo"
    }
  }
}
export {}

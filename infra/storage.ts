// this bucket is (in this version) used for both request and response objects
export const bucket = new sst.aws.Bucket("EmployeeImport");

// this table stores the actual Emplooyee data and has both empNo and phNo (GSI) as unique fieds
export const table = new sst.aws.Dynamo("Employees", {
  fields: {
    empNo: "string"
  },
  primaryIndex: { hashKey: "empNo" },
});
# Employee Imports

This workload allows input directly via an S3 bucket and exposes a HTTP GET endpoint to both check the result of bulk employee async processing.

## Input Uploads

API Gateway and Lambda functions have a upper payload site limit, therefore the upload is performed directly to S3.
The input is expected to be a JSON array containing a maximum of 10000 items and each item needs to look like the following:
[
   { "empNo": "1", "firstName": "1", "lastName": "1", "phNo": "1" },
    { "empNo": "2", "firstName": "2", "lastName": "2", "phNo": "2" }
]
The file containing the bulk employee items needs to be uploaded to a target S3 bucket, into the request/ prefix (or folder).

## Async Processing

Once the file is uploaded, S3 automatically generates an event notification which is handled by the processing function.
The processing function uses the maximum allowed Lambda timeout, because processing 10000 items can be a long process and most settings are configurable.
This function loads the input file from S3 and processes each item within a transaction.
The transaction takes care of updating the actual employee item as well as an extra unique item for only the phone number which guarantees uniqueness.
Processing 10000 items takes roughly 3 minutes to complete

## Querying Processing Report

The workload exposes an HTTP GET endpoint which allows for the caller to check the result of the input processing.
If the result is not yet produced or the request has an invalid request id, then the endpoint returns an error message.

## Testing

From the terminal in the ./tests folder, run post-valid.sh to simulate a large JSON file being uploaded to S3 to begin the async processing.
This script runs a loop and waits for the processes to be completed and presents the final results.

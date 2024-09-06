#!/bin/bash

endpoint="4agt8q6rj0.execute-api.eu-central-1.amazonaws.com"

# # Perform POST request and capture the response
# response=$(curl -s -X POST -H "Content-Type: application/json" -d @_valid.json https://$endpoint/employee-imports)
# echo $response

# # Extract the importId from the response
# importId=$(echo $response | jq -r '.importId')

# # Check if importId is null or empty
# if [ -z "$importId" ] || [ "$importId" == "null" ]; then
#   echo "Error: importId is not present or has no value."
#   exit 1
# fi

aws s3 cp _valid.json s3://employee-imports-ec2-user-employeeimport-hudbnhao/request/

# Initialize the total time spent and the time limit (900 seconds = 15 minutes)
total_time=0
time_limit=900
sleep_interval=2

while [ $total_time -lt $time_limit ]; do
  echo "Waiting for response"
  
  # Perform GET request using the importId
  get_response=$(curl -s -X GET https://$endpoint/employee-imports/$importId)
  
  # Check if the 'report' field is present in the response
  report_exists=$(echo $get_response | jq -e '.report')

  if [ $? -eq 0 ]; then
    echo "Success: Report found in the response."
    echo "GET response: $get_response"
    break
  fi

  # Increment total time and sleep
  total_time=$((total_time + sleep_interval))
  sleep $sleep_interval
done

# If the loop ends without finding the 'report' field, handle the failure case
if [ $total_time -ge $time_limit ]; then
  echo "Error: Report not found within the time limit."
  exit 1
fi
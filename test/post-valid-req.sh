#!/bin/bash

endpoint="4agt8q6rj0.execute-api.eu-central-1.amazonaws.com"

# Perform POST request and capture the response
response=$(curl -s -X POST -H "Content-Type: application/json" -d @valid.json https://$endpoint/employee-imports)
echo $response

# Extract the importJobId from the response
importJobId=$(echo $response | jq -r '.importJobId')

# Add a 5-second delay before the GET request
sleep 7

# Perform GET request using the importJobId
curl -X GET https://$endpoint/employee-imports/$importJobId

#!/bin/bash

endpoint="4agt8q6rj0.execute-api.eu-central-1.amazonaws.com"

# Perform POST request and capture the response
response=$(curl -s -X POST -H "Content-Type: application/json" -d @valid.json https://$endpoint/employee-imports)
echo $response

# Extract the importId from the response
importId=$(echo $response | jq -r '.importId')

# Add a 5-second delay before the GET request
sleep 3

# Perform GET request using the importId
curl -X GET https://$endpoint/employee-imports/$importId

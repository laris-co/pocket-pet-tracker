#!/bin/bash
curl -s http://localhost:8090/api/collections/data_imports/records?perPage=1 | jq '.items[0] | {id, import_date, source, status, json_content: (.json_content | if type == "string" then (. | length) else (. | length) end)}'

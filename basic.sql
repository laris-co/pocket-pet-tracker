-- Basic pet tracking query with essential fields
-- Usage: duckdb -csv < queries/basic.sql
-- Output: Core tracking data with MD5 hash for uniqueness

SELECT 
    name,
    strftime(to_timestamp(location.timeStamp/1000), '%Y-%m-%d %H:%M:%S') as datetime,
    location.latitude,
    location.longitude,
    location.horizontalAccuracy as accuracy,
    MD5(name || CAST(location.latitude AS VARCHAR) || CAST(location.longitude AS VARCHAR) || CAST(location.horizontalAccuracy AS VARCHAR))::VARCHAR as hash
FROM read_json_auto('Items.data', format='array', records='true')
WHERE name LIKE 'Tag %'
ORDER BY CAST(REGEXP_EXTRACT(name, '\d+') AS INT), location.timeStamp;
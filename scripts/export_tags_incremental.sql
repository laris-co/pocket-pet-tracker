-- DuckDB Incremental Export with Deduplication
-- Only exports new location records that don't already exist in the Parquet files
-- Uses time-based partitioning: tag_id=X/year=YYYY/month=MM/day=DD/

-- First, create a temporary table with existing hashes (if files exist)
CREATE TEMP TABLE IF NOT EXISTS existing_hashes AS 
SELECT DISTINCT location_hash 
FROM 'tag_data/**/*.parquet'
WHERE location_hash IS NOT NULL;

-- Show existing record count
SELECT COUNT(*) as existing_records FROM existing_hashes;

-- Export only new records (append mode)
COPY (
    WITH new_locations AS (
        SELECT 
            name,
            CAST(REGEXP_EXTRACT(name, '\d+') AS INT) as tag_id,
            strftime(to_timestamp(location.timeStamp/1000), '%Y-%m-%d %H:%M:%S') as datetime,
            location.timeStamp as timestamp_ms,
            location.latitude,
            location.longitude,
            location.horizontalAccuracy as accuracy,
            batteryStatus as battery,
            location.isInaccurate as is_inaccurate,
            MD5(name || CAST(location.latitude AS VARCHAR) || 
                CAST(location.longitude AS VARCHAR) || 
                CAST(location.horizontalAccuracy AS VARCHAR))::VARCHAR as location_hash,
            location.positionType,
            location.verticalAccuracy,
            location.floorLevel,
            location.isOld,
            location.altitude,
            location.locationFinished,
            productType,
            serialNumber,
            owner,
            -- Add year, month, and day for partitioning
            YEAR(to_timestamp(location.timeStamp/1000)) as year,
            MONTH(to_timestamp(location.timeStamp/1000)) as month,
            DAY(to_timestamp(location.timeStamp/1000)) as day
        FROM read_json_auto('Items.data', format='array')
        WHERE name LIKE 'Tag %'
    )
    SELECT * FROM new_locations
    WHERE location_hash NOT IN (SELECT location_hash FROM existing_hashes)
    ORDER BY tag_id, year, month, day, timestamp_ms DESC
) TO 'tag_data' (
    FORMAT PARQUET,
    PARTITION_BY (tag_id, year, month, day),
    FILENAME_PATTERN 'locations_{uuid}',
    APPEND
);

-- Show results
WITH stats AS (
    SELECT 
        COUNT(*) as total_after,
        COUNT(DISTINCT tag_id) as unique_tags,
        MIN(datetime) as earliest,
        MAX(datetime) as latest
    FROM 'tag_data/**/*.parquet'
)
SELECT 
    'Incremental Export Complete' as status,
    total_after - (SELECT COUNT(*) FROM existing_hashes) as new_records,
    total_after as total_records,
    unique_tags,
    latest as last_update
FROM stats;
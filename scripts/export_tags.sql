-- DuckDB Export Script for Pet Location Data
-- Exports all tag locations to Parquet files with Hive-style partitioning
-- Each tag gets its own directory: tag_data/tag_id=X/locations.parquet

-- Export all tags with partitioning
COPY (
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
        -- Generate MD5 hash matching PocketBase format
        MD5(name || CAST(location.latitude AS VARCHAR) || 
            CAST(location.longitude AS VARCHAR) || 
            CAST(location.horizontalAccuracy AS VARCHAR))::VARCHAR as location_hash,
        -- Additional metadata
        location.positionType,
        location.verticalAccuracy,
        location.floorLevel,
        location.isOld,
        location.altitude,
        location.locationFinished,
        productType,
        serialNumber,
        owner
    FROM read_json_auto('Items.data', format='array')
    WHERE name LIKE 'Tag %'
    ORDER BY tag_id, timestamp_ms DESC
) TO 'tag_data' (
    FORMAT PARQUET,
    PARTITION_BY (tag_id),
    FILENAME_PATTERN 'locations',
    OVERWRITE_OR_IGNORE
);

-- Create summary view
SELECT 
    'Export Complete' as status,
    COUNT(DISTINCT tag_id) as total_tags,
    COUNT(*) as total_records,
    MIN(datetime) as earliest_record,
    MAX(datetime) as latest_record
FROM 'tag_data/**/*.parquet';
-- Test complete export pipeline
-- Export all tags to Parquet with partitioning
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
        MD5(name || CAST(location.latitude AS VARCHAR) || 
            CAST(location.longitude AS VARCHAR) || 
            CAST(location.horizontalAccuracy AS VARCHAR))::VARCHAR as location_hash
    FROM read_json_auto('Items.data', format='array')
    WHERE name LIKE 'Tag %'
    ORDER BY tag_id, timestamp_ms
) TO 'tag_data' (
    FORMAT PARQUET,
    PARTITION_BY (tag_id),
    FILENAME_PATTERN 'locations',
    OVERWRITE_OR_IGNORE
);

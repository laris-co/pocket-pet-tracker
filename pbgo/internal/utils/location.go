package utils

import (
    "fmt"
    "time"
)

type RawLocation struct {
    TimeStamp           any     `json:"timeStamp"`
    Latitude            float64 `json:"latitude"`
    Longitude           float64 `json:"longitude"`
    HorizontalAccuracy  float64 `json:"horizontalAccuracy"`
    IsInaccurate        bool    `json:"isInaccurate"`
}

func HasValidCoordinates(loc *RawLocation) bool {
    if loc == nil {
        return false
    }
    // Latitude/Longitude are decoded as float64 when present
    return !isNaN(loc.Latitude) && !isNaN(loc.Longitude)
}

func isNaN(f float64) bool { return f != f }

// ToISO converts Apple ms timestamp or RFC3339 string to ISO8601 UTC.
func ToISO(ts any) string {
    switch v := ts.(type) {
    case float64:
        // assume milliseconds
        sec := int64(v) / 1000
        nsec := (int64(v) % 1000) * int64(time.Millisecond)
        return time.Unix(sec, nsec).UTC().Format(time.RFC3339)
    case int64:
        return time.UnixMilli(v).UTC().Format(time.RFC3339)
    case string:
        // attempt parse
        if t, err := time.Parse(time.RFC3339, v); err == nil {
            return t.UTC().Format(time.RFC3339)
        }
        return v
    default:
        return time.Now().UTC().Format(time.RFC3339)
    }
}

// LocationHash canonical formula (without timestamp) for cross-system dedup.
// Adjust if you decide to include timestamp.
func LocationHash(petName string, loc *RawLocation) string {
    s := fmt.Sprintf("%s%.8f%.8f%.2f", petName, loc.Latitude, loc.Longitude, loc.HorizontalAccuracy)
    return MD5Hex(s)
}


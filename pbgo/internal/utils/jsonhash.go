package utils

import (
    "crypto/md5"
    "encoding/hex"
    "encoding/json"
    "sort"
)

// StableStringify returns a deterministic JSON string for any JSON-like value.
// Objects have keys sorted lexicographically; arrays preserve order.
func StableStringify(v any) string {
    b := buildCanonical(v)
    enc, _ := json.Marshal(b)
    return string(enc)
}

// MD5Hex returns a lower-case 32-char md5 hex of the given text.
func MD5Hex(s string) string {
    sum := md5.Sum([]byte(s))
    return hex.EncodeToString(sum[:])
}

// buildCanonical walks v and converts map keys to sorted order
// so that the standard json.Marshal emits deterministic output.
func buildCanonical(v any) any {
    switch t := v.(type) {
    case map[string]any:
        // sort keys
        keys := make([]string, 0, len(t))
        for k := range t {
            keys = append(keys, k)
        }
        sort.Strings(keys)
        // rebuild ordered map-like slice of pairs
        ordered := make([][2]any, 0, len(keys))
        for _, k := range keys {
            ordered = append(ordered, [2]any{k, buildCanonical(t[k])})
        }
        // encode as object using a temporary struct to enforce order in Marshal
        // We convert back to map at the end to keep JSON object semantics.
        obj := make(map[string]any, len(ordered))
        for _, kv := range ordered {
            obj[kv[0].(string)] = kv[1]
        }
        return obj
    case []any:
        out := make([]any, len(t))
        for i := range t {
            out[i] = buildCanonical(t[i])
        }
        return out
    case json.RawMessage:
        var anyv any
        if err := json.Unmarshal(t, &anyv); err == nil {
            return buildCanonical(anyv)
        }
        return string(t)
    default:
        return t
    }
}


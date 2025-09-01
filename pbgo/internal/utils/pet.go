package utils

import "regexp"

var tagRe = regexp.MustCompile(`^Tag \d+$`)
var tagIdRe = regexp.MustCompile(`^Tag (\d+)$`)

func IsValidPetTag(name string) bool {
    return tagRe.MatchString(name)
}

func ExtractTagId(name string) (string, bool) {
    m := tagIdRe.FindStringSubmatch(name)
    if len(m) == 2 {
        return m[1], true
    }
    return "", false
}


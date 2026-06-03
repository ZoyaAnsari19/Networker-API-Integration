package services

import "encoding/base64"

func stdEncode(b []byte) string {
	return base64.StdEncoding.EncodeToString(b)
}

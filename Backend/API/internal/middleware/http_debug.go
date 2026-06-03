package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Max bytes of request/response body to capture for logging (each side).
const httpDebugMaxBody = 65536

var httpDebugSensitiveKeys = map[string]struct{}{
	"password":                     {},
	"old_password":                 {},
	"new_password":                 {},
	"login_password":               {},
	"current_password":             {},
	"transaction_password":         {},
	"current_transaction_password": {},
	"new_transaction_password":     {},
	"refresh_token":                {},
	"access_token":                 {},
	"token":                        {},
	"api_key":                      {},
	"api_secret":                   {},
	"x-api-key":                    {},
	"x-api-secret":                 {},
}

// HTTPDebug logs each request/response with readable JSON (when JSON) and
// redacts common secret fields. Skips raw multipart bodies. No-op when
// disabled — use for local/staging only; set HTTP_DEBUG_LOG=false in production.
func HTTPDebug(enabled bool) fiber.Handler {
	if !enabled {
		return func(c *fiber.Ctx) error { return c.Next() }
	}
	return func(c *fiber.Ctx) error {
		start := time.Now()
		url := c.OriginalURL()
		if url == "" {
			url = c.Path()
		}

		ct := strings.ToLower(c.Get("Content-Type"))
		reqBlock := buildRequestBodyLog(ct, c.Body())

		err := c.Next()

		status := c.Response().StatusCode()
		respCT := strings.ToLower(string(c.Response().Header.ContentType()))
		respBlock := buildResponseBodyLog(respCT, c.Response().Body())
		elapsed := time.Since(start)

		q := string(c.Request().URI().QueryString())
		if q == "" {
			q = "—"
		}

		msg := fmt.Sprintf(
			"\n┌── HTTP %s %s → %d (%s) %s\n"+
				"│ Query: %s\n"+
				"│ Authorization: %s\n"+
				"│ Request-Type: %s\n"+
				"├── Request body ─────────────────────────────────────────\n%s"+
				"├── Response-Type: %s\n"+
				"├── Response body ────────────────────────────────────────\n%s"+
				"└──────────────────────────────────────────────────────────\n",
			c.Method(),
			url,
			status,
			elapsed.Round(time.Millisecond),
			c.IP(),
			q,
			maskAuthHeader(c.Get("Authorization")),
			c.Get("Content-Type"),
			reqBlock,
			string(c.Response().Header.ContentType()),
			respBlock,
		)
		log.Print(msg)
		return err
	}
}

func maskAuthHeader(h string) string {
	h = strings.TrimSpace(h)
	if h == "" {
		return "(none)"
	}
	if len(h) > 12 && strings.EqualFold(h[:7], "bearer ") {
		return "Bearer ***"
	}
	return "***"
}

func buildRequestBodyLog(contentType string, raw []byte) string {
	if strings.HasPrefix(contentType, "multipart/form-data") {
		return "│ (multipart/form-data — body not logged)\n"
	}
	return formatBodyBlock(raw)
}

func buildResponseBodyLog(contentType string, raw []byte) string {
	if strings.HasPrefix(contentType, "multipart/") {
		return "│ (binary/multipart — body not logged)\n"
	}
	return formatBodyBlock(raw)
}

func formatBodyBlock(raw []byte) string {
	if len(raw) == 0 {
		return "│ (empty)\n"
	}
	truncated := ""
	if len(raw) > httpDebugMaxBody {
		raw = raw[:httpDebugMaxBody]
		truncated = "│ … truncated to " + fmt.Sprintf("%d", httpDebugMaxBody) + " bytes\n"
	}
	pretty := prettyRedactedJSON(raw)
	if pretty != "" {
		lines := strings.Split(pretty, "\n")
		var b strings.Builder
		for _, ln := range lines {
			b.WriteString("│ ")
			b.WriteString(ln)
			b.WriteByte('\n')
		}
		return b.String() + truncated
	}
	// Non-JSON: single-line safe preview
	s := strings.ReplaceAll(string(raw), "\n", " ")
	if len(s) > 2000 {
		s = s[:2000] + "…"
	}
	return "│ " + s + "\n" + truncated
}

func prettyRedactedJSON(raw []byte) string {
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return ""
	}
	redactJSONValue(v)
	out, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return ""
	}
	return string(out)
}

func redactJSONValue(v interface{}) {
	switch t := v.(type) {
	case map[string]interface{}:
		for k, val := range t {
			if _, ok := httpDebugSensitiveKeys[strings.ToLower(k)]; ok {
				t[k] = "***"
				continue
			}
			redactJSONValue(val)
		}
	case []interface{}:
		for _, el := range t {
			redactJSONValue(el)
		}
	default:
		// leaf
	}
}

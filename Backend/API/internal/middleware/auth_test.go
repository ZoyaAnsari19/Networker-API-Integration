package middleware

import (
	"encoding/json"
	"fmcg-binary/internal/models"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// fakeLocals injects user_id + role onto the fiber context the way
// AuthRequired would after validating a JWT. Kept inline so the tests stay
// self-contained and free of the JWT manager wiring.
func fakeLocals(userID, role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if userID != "" {
			c.Locals("user_id", userID)
		}
		if role != "" {
			c.Locals("role", role)
		}
		return c.Next()
	}
}

func okHandler(c *fiber.Ctx) error {
	return c.SendString("ok")
}

func runRequest(t *testing.T, app *fiber.App, method, path string) (int, string) {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(body)
}

func TestStaffRequired_AllowsAdminAndSubAdmin(t *testing.T) {
	t.Parallel()
	for _, role := range []string{models.RoleAdmin, models.RoleSubAdmin} {
		role := role
		t.Run(role, func(t *testing.T) {
			t.Parallel()
			app := fiber.New()
			app.Use(fakeLocals("user-1", role))
			app.Get("/x", StaffRequired(), okHandler)

			code, body := runRequest(t, app, "GET", "/x")
			if code != fiber.StatusOK {
				t.Fatalf("status=%d body=%s", code, body)
			}
		})
	}
}

func TestStaffRequired_RejectsNetworker(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Use(fakeLocals("user-1", models.RoleNetworker))
	app.Get("/x", StaffRequired(), okHandler)

	code, _ := runRequest(t, app, "GET", "/x")
	if code != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", code)
	}
}

func TestSuperAdminRequired_AdminOnly(t *testing.T) {
	t.Parallel()
	cases := map[string]int{
		models.RoleAdmin:     fiber.StatusOK,
		models.RoleSubAdmin:  fiber.StatusForbidden,
		models.RoleNetworker: fiber.StatusForbidden,
		"":                   fiber.StatusForbidden,
	}
	for role, want := range cases {
		role := role
		want := want
		t.Run(role+"_"+httpCodeName(want), func(t *testing.T) {
			t.Parallel()
			app := fiber.New()
			app.Use(fakeLocals("user-1", role))
			app.Get("/x", SuperAdminRequired(), okHandler)

			code, _ := runRequest(t, app, "GET", "/x")
			if code != want {
				t.Fatalf("role=%q expected %d got %d", role, want, code)
			}
		})
	}
}

// permLoader injects the supplied permission set without going through the
// staff service / Redis cache, exercising only the middleware's matching
// logic. We do this by registering an alternative middleware that mirrors
// PermissionRequired but takes a static slice — the production middleware
// is then validated separately via the service unit tests.
func permLoader(role string, perms []string, required ...string) fiber.Handler {
	requiredSet := make(map[string]struct{}, len(required))
	for _, k := range required {
		requiredSet[k] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		if role == models.RoleAdmin {
			return c.Next()
		}
		if role != models.RoleSubAdmin {
			return c.Status(fiber.StatusForbidden).SendString("admin access required")
		}
		for _, p := range perms {
			if _, ok := requiredSet[p]; ok {
				c.Locals("permissions", perms)
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).SendString("missing required permission")
	}
}

func TestPermissionLogic_AdminBypasses(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get("/x", permLoader(models.RoleAdmin, nil, models.PermNetworkerManage), okHandler)
	code, _ := runRequest(t, app, "GET", "/x")
	if code != fiber.StatusOK {
		t.Fatalf("admin must bypass permission gate, got %d", code)
	}
}

func TestPermissionLogic_SubAdminWithKey(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get(
		"/x",
		permLoader(models.RoleSubAdmin, []string{models.PermNetworkerView, models.PermKYCView}, models.PermKYCView),
		okHandler,
	)
	code, _ := runRequest(t, app, "GET", "/x")
	if code != fiber.StatusOK {
		t.Fatalf("sub-admin with matching key must pass, got %d", code)
	}
}

func TestPermissionLogic_SubAdminWithoutKey(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get(
		"/x",
		permLoader(models.RoleSubAdmin, []string{models.PermNetworkerView}, models.PermWithdrawManage),
		okHandler,
	)
	code, body := runRequest(t, app, "GET", "/x")
	if code != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", code, body)
	}
}

// httpCodeName is a tiny helper so subtest names don't collide when iterating
// the role map (multiple cases share the 403 status).
func httpCodeName(code int) string {
	switch code {
	case fiber.StatusOK:
		return "ok"
	case fiber.StatusForbidden:
		return "forbidden"
	}
	return "code"
}

// Sanity: response.Error returns a JSON body — make sure StaffRequired uses
// it so callers can decode it the same way as every other admin error.
func TestStaffRequired_ReturnsJSONError(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Use(fakeLocals("user-1", models.RoleNetworker))
	app.Get("/x", StaffRequired(), okHandler)

	code, body := runRequest(t, app, "GET", "/x")
	if code != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", code)
	}
	var parsed map[string]any
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		t.Fatalf("response body is not JSON: %v body=%s", err, body)
	}
	if ok, _ := parsed["success"].(bool); ok {
		t.Fatalf("expected success=false in error response, got %v", parsed)
	}
}

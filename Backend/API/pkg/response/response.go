package response

import "github.com/gofiber/fiber/v2"

type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
	Details any    `json:"details,omitempty"`
}

type PaginatedResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data"`
	Meta    Meta   `json:"meta"`
	Error   string `json:"error,omitempty"`
}

type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"total_pages"`
}

func Success(c *fiber.Ctx, statusCode int, message string, data any) error {
	return c.Status(statusCode).JSON(APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Error(c *fiber.Ctx, statusCode int, message string) error {
	return c.Status(statusCode).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

func ErrorWithDetails(c *fiber.Ctx, statusCode int, message string, details any) error {
	return c.Status(statusCode).JSON(APIResponse{
		Success: false,
		Error:   message,
		Details: details,
	})
}

func Paginated(c *fiber.Ctx, data any, page, limit int, total int64) error {
	totalPages := total / int64(limit)
	if total%int64(limit) != 0 {
		totalPages++
	}
	if data == nil {
		data = []any{}
	}
	return c.Status(fiber.StatusOK).JSON(PaginatedResponse{
		Success: true,
		Data:    data,
		Meta: Meta{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

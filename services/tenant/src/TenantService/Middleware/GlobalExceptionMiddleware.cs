using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace TenantService.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred. TraceId: {TraceId}", context.TraceIdentifier);
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = CreateErrorResponse(exception, context.TraceIdentifier);

        context.Response.StatusCode = response.StatusCode;

        var jsonResponse = JsonSerializer.Serialize(response.Body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private ErrorResponse CreateErrorResponse(Exception exception, string traceId)
    {
        return exception switch
        {
            ValidationException validationEx => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Body = new ErrorDetails
                {
                    Title = "Validation Failed",
                    Detail = validationEx.Message,
                    Type = "https://httpstatuses.com/400",
                    TraceId = traceId,
                    Errors = validationEx.Data.Count > 0
                        ? validationEx.Data.Cast<object>().ToDictionary(k => k.ToString()!, v => new[] { v.ToString()! })
                        : null
                }
            },
            ArgumentException argEx => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Body = new ErrorDetails
                {
                    Title = "Invalid Argument",
                    Detail = argEx.Message,
                    Type = "https://httpstatuses.com/400",
                    TraceId = traceId
                }
            },
            UnauthorizedAccessException => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.Unauthorized,
                Body = new ErrorDetails
                {
                    Title = "Unauthorized",
                    Detail = "Authentication required",
                    Type = "https://httpstatuses.com/401",
                    TraceId = traceId
                }
            },
            InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("not found") => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.NotFound,
                Body = new ErrorDetails
                {
                    Title = "Resource Not Found",
                    Detail = invalidOpEx.Message,
                    Type = "https://httpstatuses.com/404",
                    TraceId = traceId
                }
            },
            TimeoutException => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.RequestTimeout,
                Body = new ErrorDetails
                {
                    Title = "Request Timeout",
                    Detail = "The request took too long to process",
                    Type = "https://httpstatuses.com/408",
                    TraceId = traceId
                }
            },
            _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.InternalServerError,
                Body = new ErrorDetails
                {
                    Title = "Internal Server Error",
                    Detail = _environment.IsDevelopment()
                        ? exception.Message
                        : "An error occurred while processing your request",
                    Type = "https://httpstatuses.com/500",
                    TraceId = traceId,
                    StackTrace = _environment.IsDevelopment() ? exception.StackTrace : null
                }
            }
        };
    }

    private class ErrorResponse
    {
        public int StatusCode { get; set; }
        public ErrorDetails Body { get; set; } = null!;
    }

    private class ErrorDetails
    {
        public string Title { get; set; } = null!;
        public string Detail { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string TraceId { get; set; } = null!;
        public string? StackTrace { get; set; }
        public Dictionary<string, string[]>? Errors { get; set; }
    }
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
    public ValidationException(string message, Exception innerException) : base(message, innerException) { }
}
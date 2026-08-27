using System.Net;
using Microsoft.AspNetCore.Mvc;
using OrderService.Exceptions;

namespace OrderService.Middleware;

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
            _logger.LogError(ex, "An unhandled exception occurred in Order Service. TraceId: {TraceId}", context.TraceIdentifier);
            await WriteProblemAsync(context, ex);
        }
    }

    // Same response contract ASP.NET Core's own model-validation failures already use
    // (ValidationProblemDetails is a ProblemDetails) - previously this middleware emitted
    // a differently-shaped, hand-rolled JSON body for every other kind of failure.
    private async Task WriteProblemAsync(HttpContext context, Exception exception)
    {
        var (status, title, detail) = Classify(exception, _environment.IsDevelopment());

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{status}",
            Instance = context.Request.Path,
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;
        if (status == (int)HttpStatusCode.InternalServerError && _environment.IsDevelopment())
            problem.Extensions["stackTrace"] = exception.StackTrace;

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(problem);
    }

    // Classified purely by exception type - no message-content sniffing. A message
    // wording change can no longer silently change the client-facing status code.
    private static (int Status, string Title, string Detail) Classify(Exception exception, bool isDevelopment) =>
        exception switch
        {
            ArgumentException argEx => ((int)HttpStatusCode.BadRequest, "Invalid Argument", argEx.Message),
            BusinessRuleException ruleEx => ((int)HttpStatusCode.BadRequest, "Business Rule Violation", ruleEx.Message),
            UnauthorizedAccessException => ((int)HttpStatusCode.Unauthorized, "Unauthorized", "Authentication required"),
            KeyNotFoundException notFoundEx => ((int)HttpStatusCode.NotFound, "Resource Not Found", notFoundEx.Message),
            ConflictException conflictEx => ((int)HttpStatusCode.Conflict, "Conflict", conflictEx.Message),
            TimeoutException => ((int)HttpStatusCode.RequestTimeout, "Request Timeout", "The request took too long to process"),
            _ => ((int)HttpStatusCode.InternalServerError, "Internal Server Error",
                isDevelopment ? exception.Message : "An error occurred while processing your request"),
        };
}

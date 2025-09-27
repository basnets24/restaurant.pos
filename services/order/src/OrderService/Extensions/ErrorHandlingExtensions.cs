using OrderService.Middleware;

namespace OrderService.Extensions;

public static class ErrorHandlingExtensions
{
    public static IServiceCollection AddErrorHandling(this IServiceCollection services)
    {
        // Configure API behavior for better error responses
        services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
        {
            // Customize problem details for validation errors
            options.InvalidModelStateResponseFactory = context =>
            {
                var problemDetails = new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(context.ModelState)
                {
                    Title = "Validation Failed",
                    Type = "https://httpstatuses.com/400",
                    Detail = "One or more validation errors occurred.",
                    Instance = context.HttpContext.Request.Path
                };

                problemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

                return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(problemDetails);
            };
        });

        return services;
    }

    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionMiddleware>();
    }
}
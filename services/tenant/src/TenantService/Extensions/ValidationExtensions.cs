using TenantService.Filters;
using TenantService.Middleware;

namespace TenantService.Extensions;

public static class ValidationExtensions
{
    public static IServiceCollection AddValidationAndErrorHandling(this IServiceCollection services)
    {
        // Configure controllers with validation filters
        services.Configure<Microsoft.AspNetCore.Mvc.MvcOptions>(options =>
        {
            // Add global model validation filter
            options.Filters.Add<ModelValidationFilter>();
            options.Filters.Add<BusinessRuleValidationFilter>();
        });

        // Configure API behavior for validation
        services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
        {
            // Disable default model validation responses since we handle them in our filter
            options.SuppressModelStateInvalidFilter = true;

            // Customize problem details
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
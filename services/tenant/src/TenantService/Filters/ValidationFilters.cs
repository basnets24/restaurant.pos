using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TenantService.Middleware;

namespace TenantService.Filters;

public class ModelValidationFilter : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value?.Errors.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                );

            var validationResult = new ValidationProblemDetails(context.ModelState)
            {
                Title = "Validation Failed",
                Type = "https://httpstatuses.com/400",
                Detail = "One or more validation errors occurred.",
                Instance = context.HttpContext.Request.Path
            };

            // Add trace ID for correlation
            validationResult.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

            context.Result = new BadRequestObjectResult(validationResult);
        }
    }
}

public class BusinessRuleValidationFilter : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        // Custom business rule validation can be added here
        // For now, we'll focus on model validation
        base.OnActionExecuting(context);
    }
}
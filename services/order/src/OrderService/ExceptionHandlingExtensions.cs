using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace OrderService;

public static class ExceptionHandlingExtensions
{
    public static IApplicationBuilder UseApiProblemDetails(this IApplicationBuilder app)
    {
        app.UseExceptionHandler(errApp =>
        {
            errApp.Run(async context =>
            {
                var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;

                var (status, title) = ex switch
                {
                    InvalidOperationException           => (StatusCodes.Status409Conflict, "Conflict"),
                    ArgumentException or ArgumentNullException => (StatusCodes.Status400BadRequest, "Bad Request"),
                    KeyNotFoundException                => (StatusCodes.Status404NotFound, "Not Found"),
                    _                                   => (StatusCodes.Status500InternalServerError, "Server Error")
                };

                context.Response.StatusCode = status;
                context.Response.ContentType = "application/json";

                var problem = new ProblemDetails
                {
                    Title = title,
                    Detail = ex?.Message,
                    Status = status,
                    Type = $"https://httpstatuses.com/{status}",
                    Instance = context.Request.Path
                };

                await context.Response.WriteAsJsonAsync(problem);
            });
        });

        return app;
    }
}

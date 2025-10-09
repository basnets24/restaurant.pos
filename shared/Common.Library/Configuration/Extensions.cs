using Azure.Identity;
using Common.Library.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Common.Library.Configuration;

public static class Extensions
{
    public static IHostBuilder ConfigureAzureKeyVault(this IHostBuilder builder)
    {
        return builder
                .ConfigureAppConfiguration((context, configurationBuilder) =>
                {
                    if (!context.HostingEnvironment.IsProduction())
                        return;

                    var configuration   = configurationBuilder.Build();
                    var serviceSettings = configuration
                        .GetRequiredSection(nameof(ServiceSettings))
                        .Get<ServiceSettings>()
                        ?? throw new InvalidOperationException("ServiceSettings section is missing or empty.");

                    if (string.IsNullOrWhiteSpace(serviceSettings.KeyVaultName))
                        throw new InvalidOperationException("ServiceSettings:KeyVaultName must be configured for Azure Key Vault.");

                    configurationBuilder.AddAzureKeyVault(
                        new Uri($"https://{serviceSettings.KeyVaultName}.vault.azure.net/"),
                        new DefaultAzureCredential());
                }); 
    }
}

using MongoDB.Driver;

namespace Common.Library.MongoDB;

// to demonstrate a custom additional index configuration for a repo 
// base index is tenant (rid + lid) setup in tenant repository 
// additional index can be configured to current tenant repository setup
// by implementing and passing IEnumerable<IMongoIndexConfigurator<T>>? configurators = null
public interface IMongoIndexConfigurator<T>
{
    void Configure(IMongoCollection<T> collection);
}
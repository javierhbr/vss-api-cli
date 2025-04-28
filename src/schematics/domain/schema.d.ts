export interface Schema {
  /**
   * The name of the domain.
   */
  name: string;

  /**
   * Whether to generate a domain model or not.
   */
  model?: boolean;

  /**
   * Custom name for the model (defaults to domain name if not specified).
   */
  modelName?: string;

  /**
   * Whether to generate a domain service or not.
   */
  service?: boolean;

  /**
   * Custom name for the service (defaults to domainNameService if not specified).
   */
  serviceName?: string;

  /**
   * Whether to generate a port interface or not.
   */
  port?: boolean;

  /**
   * Custom name for the port (defaults to domainNameAdapterTypePort if not specified).
   */
  portName?: string;

  /**
   * The type of adapter for the port (repository, rest, graphql, none).
   */
  adapterType?: string;
  
  /**
   * The case format to use for file names (pascal, camel, kebab, snake).
   */
  fileNameCase?: 'pascal' | 'camel' | 'kebab' | 'snake';
  
  /**
   * Custom name for the adapter (defaults to domainNameAdapterTypeAdapter if not specified).
   */
  adapterName?: string;

  /**
   * The path to create the domain directory.
   */
  path?: string;

  /**
   * The name of the project.
   */
  project?: string;
}
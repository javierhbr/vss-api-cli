export interface PortOptions {
  /**
   * The name of the port (e.g., UserFinder)
   */
  name: string;
  
  /**
   * The domain this port belongs to
   */
  domain: string;
  
  /**
   * The type of adapter that will implement this port
   */
  adapterType?: 'repository' | 'rest' | 'graphql';
  
  /**
   * The path to create the port files
   */
  path?: string;
  
  /**
   * The name of the project
   */
  project?: string;

  /**
   * Custom name for the port interface
   */
  portInterfaceName?: string;
}
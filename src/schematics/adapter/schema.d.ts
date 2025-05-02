export interface AdapterSchema {
  name: string;
  path?: string;
  domain: string;
  port: string;
  adapterType: 'repository' | 'rest' | 'graphql' | 'queue' | 'storage';
  
  /**
   * The case style to use for file names.
   * Options: 'pascal', 'camel', 'kebab', 'snake'
   */
  fileNameCase?: 'pascal' | 'camel' | 'kebab' | 'snake';
    
  /**
   * Internal configuration passed from command.
   */
  _config?: any;
  
  /**
   * Custom file path for adapter file (from configuration).
   */
  adapterFilePath?: string;
  
  /**
   * Custom file name for adapter file (from configuration).
   */
  adapterFileName?: string;
  
  /**
   * Fully qualified port name (for import).
   */
  portName?: string;
}
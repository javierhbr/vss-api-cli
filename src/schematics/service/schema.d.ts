export interface Schema {
    /**
     * The name of the service.
     */
    name: string;
    
    /**
     * The domain this service belongs to.
     */
    domain?: string;
    
    /**
     * Generate a model file with the same name as the service.
     */
    model?: boolean;
    
    /**
     * Include port dependencies in the service.
     */
    ports?: boolean;
    
    /**
     * The path to create the service files.
     */
    path?: string;
    
    /**
     * The name of the project.
     */
    project?: string;
}
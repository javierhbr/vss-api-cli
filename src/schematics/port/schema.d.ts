export interface Schema {
    /**
     * The name of the port (e.g., UserFinder, PaymentGateway).
     */
    name: string;
    
    /**
     * The domain this port belongs to.
     */
    domain: string;
    
    /**
     * The type of adapter that will implement this port.
     */
    adapterType?: 'repository' | 'rest' | 'graphql';
    
    /**
     * The path to create the port files.
     */
    path?: string;
    
    /**
     * The name of the project.
     */
    project?: string;
}
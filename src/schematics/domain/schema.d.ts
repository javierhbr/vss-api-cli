export interface Schema {
    /**
     * The name of the domain.
     */
    name: string;

    /**
     * Generate a domain model file.
     */
    model?: boolean;

    /**
     * Generate a domain service file.
     */
    service?: boolean;

    /**
     * Generate a domain port interface and its adapter.
     */
    port?: boolean;

    /**
     * The type of adapter for the port.
     */
    adapterType?: 'repository' | 'rest' | 'graphql' | 'none';

    /**
     * The path to create the domain directory.
     */
    path?: string;

    /**
     * The name of the project.
     */
    project?: string;
}
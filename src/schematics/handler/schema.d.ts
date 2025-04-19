export interface Schema {
    /**
     * The name of the handler.
     */
    name: string;

    /**
     * Generate a Zod schema file.
     */
    schema?: boolean;

    /**
     * The path to create the handler.
     */
    path?: string;

    /**
     * The name of the project.
     */
    project?: string;
}
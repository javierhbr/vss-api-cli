export interface Schema {
    /**
     * The name of the handler.
     */
    name: string;

    /**
     * Generate a JSON Schema file.
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

    /**
     * The domain of the service to use.
     */
    serviceDomain?: string;

    /**
     * The name of the service to use.
     */
    serviceName?: string;

    /**
     * Whether to create a Zod Request DTO schema.
     */
    createRequestDto?: boolean;

    /**
     * Whether to create a Zod Response DTO schema.
     */
    createResponseDto?: boolean;

    /**
     * Whether to skip validation.
     */
    noValidation?: boolean;
}
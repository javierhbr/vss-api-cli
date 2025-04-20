---
sidebar_position: 2
---

# Project Architecture

This document outlines the typical project structure generated and encouraged by the `vss-api-cli` tool, following Hexagonal Architecture principles.

## Core Concepts

- **Hexagonal Architecture (Ports and Adapters):** The core application logic (domain) is isolated from external concerns (like databases, APIs, frameworks) using ports (interfaces) and adapters (implementations).
- **Separation of Concerns:** Different parts of the application (handlers, domain logic, infrastructure) are kept distinct.

## Folder Structure

The CLI generates files following this structure within your `src/` directory:

```plaintext
src/
├── handlers/                  # Entrypoints (e.g., Lambda functions) - Inbound Adapters
│   ├── createUser.handler.ts
│   ├── getUser.handler.ts
│   └── schemas/               # Input validation schemas (e.g., Zod)
│       └── customRequestSchema.ts
│
├── {domain}/                  # Domain layer (core business logic)
│   ├── models/                # Domain entities or aggregates
│   │   └── User.ts
│   ├── exceptions/            # Custom domain-specific exceptions
│   │   └── UserNotFoundException.ts
│   ├── services/              # Domain services orchestrating logic
│   │   └── UserService.ts
│   └── ports/                 # Interfaces defining contracts for external dependencies (Outbound Ports)
│       └── UserRepositoryPort.ts
│
├── infra/                     # Infrastructure layer (Outbound Adapters)
│   ├── repositories/          # Data persistence implementations
│   │   └── DynamoUserRepositoryAdapter.ts # Implements UserRepositoryPort
│   ├── rest/                  # External API clients
│   │   └── PaymentGatewayAdapter.ts
│   └── ...                    # Other infrastructure adapters (e.g., message queues, external services)
│
├── config/                    # Configuration files
│   ├── default.json
│   └── dev.json
│
├── shared/                    # Utilities, types, logger, etc. reusable across the application
│   ├── utils.ts
│   └── logger.ts
│
└── index.ts                   # Main application entry point or composition root (if applicable)
```

### Key Directories Explained

*   **`handlers/`**: Contains the entry points for your application (e.g., AWS Lambda handlers, API route controllers). These are *Inbound Adapters* that translate external requests into calls to your domain services.
*   **`{domain}/`**: This is the heart of your application. It contains the core business logic, models, and rules, completely independent of any framework or infrastructure details.
    *   **`models/`**: Defines the core data structures (entities, value objects).
    *   **`services/`**: Contains the application and domain services that orchestrate use cases.
    *   **`ports/`**: Defines the interfaces (*Outbound Ports*) that the domain logic needs to interact with the outside world (e.g., `UserRepositoryPort`).
*   **`infra/`**: Contains the concrete implementations (*Outbound Adapters*) of the ports defined in the domain layer. This is where database interactions, external API calls, etc., happen.
*   **`shared/`**: Holds common utilities, types, or configurations used across different layers.
*   **`config/`**: Stores environment-specific or application-wide configurations.

This structure ensures that the core domain logic remains pure and testable, decoupled from the complexities of external systems.
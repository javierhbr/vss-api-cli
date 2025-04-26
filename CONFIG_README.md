# Using the Configuration File in VSS-API-CLI

The `vss-api.config.json` file allows you to customize how VSS-API-CLI generates files and directories. Here are some practical examples to help you get started:

## 1. Basic Configuration Example

Create a `vss-api.config.json` file in your project root:

```json
{
  "basePath": "src",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.function.ts",
      "schemaFile": "{{dashName}}.schema.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "functions",
      "schema": "functions/schemas"
    }
  }
}
```

With this configuration:
- When running `vss-api-cli create:handler createUser`, instead of creating `src/handlers/create-user.handler.ts`, it will generate `src/functions/create-user.function.ts`
- Schema files will be named `create-user.schema.ts` instead of `CreateUserSchema.ts`

Example output structure:
```
src/
└── functions/
    ├── create-user.function.ts
    ├── schemas/
        └── create-user.dto.ts
```

## 2. Changing Directory Structure for Clean Architecture

```json
{
  "basePath": "src",
  "directories": {
    "domain": {
      "base": "core/domain/{{domainName}}",
      "model": "core/domain/{{domainName}}/entities",
      "service": "core/domain/{{domainName}}/use-cases",
      "port": "core/ports/output"
    },
    "handler": {
      "base": "adapters/primary",
      "schema": "adapters/primary/schemas"
    },
    "adapter": {
      "base": "adapters/secondary/{{adapterType}}"
    }
  },
  "filePatterns": {
    "domain": {
      "modelFile": "{{pascalName}}Entity.ts",
      "serviceFile": "{{pascalName}}UseCase.ts",
      "portFile": "I{{pascalName}}Repository.ts"
    },
    "handler": {
      "handlerFile": "{{pascalName}}Controller.ts"
    }
  }
}
```

This configuration transforms your project structure to follow clean architecture conventions:
- Domain entities go in `src/core/domain/[domainName]/entities/`
- Services become use cases in `src/core/domain/[domainName]/use-cases/`
- Handlers become controllers in `src/adapters/primary/`
- Adapters go in `src/adapters/secondary/[adapterType]/`

Example output structure for `create:domain payment` and `create:handler createPayment`:
```
src/
├── core/
│   └── domain/
│       └── payment/
│           ├── entities/
│           │   └── PaymentEntity.ts
│           └── use-cases/
│               └── PaymentUseCase.ts
├── adapters/
│   ├── primary/
│   │   ├── CreatePaymentController.ts
│   │   └── schemas/
│   │       └── create-payment.dto.ts
│   └── secondary/
│       └── repository/
│           └── PaymentRepositoryAdapter.ts
└── core/
    └── ports/
        └── output/
            └── IPaymentRepository.ts
```

## 3. Complex Configuration for DDD-style Project

```json
{
  "basePath": "src",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{pascalName}}Handler.ts",
      "schemaFile": "{{pascalName}}Validator.ts",
      "dtoFile": "{{pascalName}}Dto.ts"
    },
    "domain": {
      "modelFile": "{{pascalName}}.ts",
      "serviceFile": "{{pascalName}}Aggregate.ts",
      "portFile": "I{{pascalName}}Repository.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "api/handlers",
      "schema": "api/validators"
    },
    "domain": {
      "base": "domain/{{domainName}}",
      "model": "domain/{{domainName}}/entities",
      "service": "domain/{{domainName}}/aggregates",
      "port": "domain/{{domainName}}/repositories"
    },
    "adapter": {
      "base": "infrastructure/persistence/{{adapterType}}"
    }
  }
}
```

This configuration creates a Domain-Driven Design structure:
- Handlers go in `src/api/handlers/`
- Validators (schemas) go in `src/api/validators/`
- Domain entities in `src/domain/[domainName]/entities/`
- Services become aggregates in `src/domain/[domainName]/aggregates/`
- Ports become repository interfaces in `src/domain/[domainName]/repositories/`
- Adapters become persistence implementations in `src/infrastructure/persistence/[adapterType]/`

Example output structure for `create:domain order` and `create:handler processOrder`:
```
src/
├── api/
│   ├── handlers/
│   │   └── ProcessOrderHandler.ts
│   └── validators/
│       └── ProcessOrderValidator.ts
│       └── ProcessOrderDto.ts
├── domain/
│   └── order/
│       ├── entities/
│       │   └── Order.ts
│       ├── aggregates/
│       │   └── OrderAggregate.ts
│       └── repositories/
│           └── IOrderRepository.ts
└── infrastructure/
    └── persistence/
        └── repository/
            └── OrderRepositoryAdapter.ts
```

## 4. AWS Lambda-specific Configuration

```json
{
  "basePath": "src",
  "filePatterns": {
    "handler": {
      "handlerFile": "index.ts",
      "schemaFile": "schema.ts",
      "dtoFile": "types.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "functions/{{dashName}}",
      "schema": "functions/{{dashName}}"
    }
  }
}
```

This configuration arranges your code for AWS Lambda deployment:
- Each handler gets its own directory: `src/functions/[handler-name]/`
- Handler files are named `index.ts` to match Lambda conventions
- Schema and type definitions live alongside the handler

Example output structure for `vss-api-cli create:handler processPayment`:
```
src/
└── functions/
    └── process-payment/
        ├── index.ts
        ├── schema.ts
        └── types.ts
```

## 5. NestJS-style Configuration

```json
{
  "basePath": "src",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.controller.ts",
      "schemaFile": "{{dashName}}.dto.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    },
    "service": {
      "serviceFile": "{{dashName}}.service.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "modules/{{domainName}}",
      "schema": "modules/{{domainName}}/dto"
    },
    "service": {
      "base": "modules/{{domainName}}/services"
    },
    "domain": {
      "model": "modules/{{domainName}}/entities",
      "service": "modules/{{domainName}}/services"
    }
  }
}
```

This configuration follows NestJS conventions:
- All components are organized by feature modules in `src/modules/[domainName]/`
- Uses `.controller.ts`, `.service.ts`, and `.dto.ts` extension naming convention

Example output structure for domain "users" with `create:handler createUser` and `create:service UserManagement`:
```
src/
└── modules/
    └── users/
        ├── create-user.controller.ts
        ├── dto/
        │   └── create-user.dto.ts
        ├── entities/
        │   └── User.ts
        └── services/
            └── user-management.service.ts
```

## Template Variables Reference

You can use these variables in your file and directory patterns:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | Raw name as provided | `createUser` |
| `{{pascalName}}` | PascalCase version | `CreateUser` |
| `{{dashName}}` | Kebab-case version | `create-user` |
| `{{camelName}}` | CamelCase version | `createUser` |
| `{{domainName}}` | Domain name (if applicable) | `payment` |
| `{{serviceName}}` | Service name (if applicable) | `PaymentProcessor` |
| `{{adapterType}}` | Adapter type (if applicable) | `repository` |

## Usage Workflow

1. Create a `vss-api.config.json` file in your project root
2. Define your preferred file patterns and directory structure
3. Run VSS-API-CLI commands as usual
4. The CLI will automatically detect and use your configuration

The configuration applies to all commands (`create:handler`, `create:domain`, `create:service`, etc.) and ensures consistent file organization across your project.
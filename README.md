# VSS-API-CLI

A CLI tool for scaffolding API projects with hexagonal architecture. This tool helps you quickly generate handlers, domains, ports, and services following clean architecture best practices.

https://javierhbr.github.io/vss-api-cli/


## Installation

### Global Installation

```bash 
npm install -g vss-api-cli
```

### Local Installation

```bash
npm install --save-dev vss-api-cli
```

## Usage

The CLI provides specific commands to generate different components:

```bash
vss-api-cli create:<component> <name> [options]
```

You can also use the shorthand aliases for each command:

```bash
vss-api-cli <alias> <name> [options]
```

## Commands and Options


```
src/
├── handlers/                  # Entrypoints (Lambdas) - Adapters Inbound
│   ├── createUser.handler.ts
│   │   ├── getUser.handler.ts
│   │   └── schemas/              # zod schemas
│   │        └── customRequesSchema.ts  # define Dto from zod schemas
│   │── middlewares/              # Middy middleware definitions
│   │    ├── dependencyInjection.ts # Dependency injection (wire up ports to adapters)
│   │    └── customMiddleware.ts
├── {domain}/                       # Domain layer (core business logic)
│   ├── models/
│   │   └── User.ts               # Domain entities or aggregates
│   ├── exceptions/
│   │   └── customException.ts    # Domain logic exceptions
│   ├── services/
│   │   └── UserService.ts        # Domain logic (pure functions preferred)
│   │   └── TranactionsService.ts        # Domain logic (pure functions preferred)
│   └── ports/                    # Interfaces (Ports)
│       ├── callSessionRepositoryPort.ts  # Data needed by the Domain Logic
│       ├── accountInfoPort.ts            
│       └── accountTranctionsPort.ts
├── infra/              # Adapters Outbound (external integrations) to satisfy the domain logic needs
│   ├── repositories/
│   │   │── sessionStoreRepositoryAdapter.ts # implement callSessionRepository.ts
│   │   └── adapterZodDto.ts # define Dto from zod schemas
│   ├── rest/
│   │   │── ccaCustomerAdapter.ts # 
│   │   └── adapterZodDto.ts # define Dto from zod schemas
│   └── graphql/
│       ├── tranctionsNonMilesAdapter.ts # implement accountTranctionsPort.ts
│       │── tranctionsMilesAdapter.ts  # implement accountTranctionsPort.ts
│       └── adapterZodDto.ts # define Dto from zod schemas
├── config/                      # Configuration files (.json, constants)
│   ├── default.json
    └── dev.json
├── shared/                      # Utilities, types, logger, etc. reusable agnostic logic between domains
│   ├── utils.ts
│   └── logger.ts
├── index.ts                     # main loading handler for lambdas. enable the middy handler and cross middlewares
└── routes.ts                    # (Optional) routes to handle  API request
```

### Handler Generator (`create:handler` or `ch`)

Creates a new API handler with optional schema validation.

```bash
vss-api-cli create:handler <name> [options]
# or
vss-api-cli ch <name> [options]
```

**Options:**
- `-p, --path <outputPath>` - Specify a custom output path for the handler
- `-s, --schema` - Generate schema validation files
- `--no-validation` - Skip schema validation setup

**Examples:**
```bash
# Basic handler creation
vss-api-cli create:handler createUser

# Handler with schema validation
vss-api-cli create:handler createUser --schema

# Handler in custom path with schema
vss-api-cli create:handler createUser -p src/functions -s

# Non-interactive creation
vss-api-cli create:handler createUser -y

# Handler without validation
vss-api-cli create:handler createUser --no-validation
```

### Domain Generator (`create:domain` or `cd`)

Creates a new domain with models, services, and ports.

```bash
vss-api-cli create:domain <domainName> [options]
# or
vss-api-cli cd <domainName> [options]
```

**Options:**
- `-p, --path <outputPath>` - Specify a custom output path (default: `src/<domainName>`)
- `-y, --yes` - Skip prompts and use default options
- `--no-model` - Skip model generation
- `--no-service` - Skip service generation
- `--no-port` - Skip port generation
- `--adapter-type <type>` - Type of adapter (repository, rest, graphql, none)

**Examples:**
```bash
# Basic domain creation (interactive)
vss-api-cli create:domain user

# Domain with custom path
vss-api-cli create:domain payment --path src/domains

# Domain with REST adapter
vss-api-cli create:domain product --adapter-type rest

# Domain without model
vss-api-cli create:domain order --no-model

# Domain with specific components
vss-api-cli create:domain catalog --no-port --no-service

# Non-interactive with defaults
vss-api-cli create:domain user -y

# Complete custom setup
vss-api-cli create:domain payment --adapter-type graphql --path custom/path --no-model
```

### Port Generator (`create:port` or `cp`)

Creates a new port interface and its infrastructure adapter implementation.

```bash
vss-api-cli create:port <name> [options]
# or
vss-api-cli cp <name> [options]
```

**Options:**
- `-p, --path <outputPath>` - Specify a custom output path (default: `src/ports`)
- `-d, --domain <domainName>` - Specify the domain name the port belongs to
- `-y, --yes` - Skip prompts and use default options

**Examples:**
```bash
# Basic port creation
vss-api-cli create:port userRepository

# Port with custom path
vss-api-cli create:port userRepository --path src/adapters

# Port for a specific domain
vss-api-cli create:port userRepository --domain user

# Non-interactive creation
vss-api-cli create:port userRepository -y
```

### Service Generator (`create:service` or `cs`)

Creates a new domain service.

```bash
vss-api-cli create:service <name> [options]
# or
vss-api-cli cs <name> [options]
```

**Options:**
- `--domain` (`-d`): Specify the domain name the service belongs to
- `--path <outputPath>`: Specify a custom output path

**Example:**
```bash
vss-api-cli create:service UserCreator -d user
```

This creates:
- `<outputPath>/src/user/services/UserCreatorService.ts`

## Interactive Prompts

If you don't specify required options, the CLI will prompt you for the needed information interactively. For automated workflows, you can use the `--yes` flag to skip prompts and use default values.

## Automatic Domain Detection

When creating a port or service, the CLI will automatically detect existing domains in your project and offer them as choices in an interactive prompt if you don't specify the domain name with the `--domain` option. This makes it easy to add new components to existing domains.

```bash
# The CLI will scan for domains and show them as options
vss-api-cli create:service UserUpdater
```

### On-the-fly Domain Creation

When creating a port, if you need a new domain that doesn't exist yet, you can select the "+ Create new domain..." option when prompted for which domain the port belongs to. This will start the domain creation workflow without requiring you to run a separate command.

```bash
# When asked "Which domain does this port belong to?"
# You can select "+ Create new domain..." from the list
vss-api-cli create:port UserRepository
```

This streamlines the workflow by allowing you to create a new domain and immediately add a port to it in a single command.

## Generated Project Structure

The CLI generates files following this structure:

```
<outputPath>/
└── src/
    ├── handlers/
    │   ├── createUser.handler.ts
    │   └── createUserSchema.ts
    ├── <domain>/
    │   ├── models/
    │   │   └── <Model>.ts
    │   ├── ports/
    │   │   └── <Model><AdapterType>Port.ts
    │   └── services/
    │       └── <Model>Service.ts
    └── infra/
        ├── repository/
        │   └── <Model>RepositoryAdapter.ts
        ├── rest/
        │   └── <Model>RestAdapter.ts
        └── graphql/
            └── <Model>GraphqlAdapter.ts
```

All generated code follows a consistent structure that adheres to hexagonal architecture principles, with clear separation between domain logic and infrastructure concerns.

## Detailed File Structure

Here's a more detailed look at the files generated by each command:

### Handler Files
- **Handler File**: Contains the main API handler function, with proper error handling and response formatting
- **Schema File**: Contains Zod validation schema for request validation (when using --schema option)

### Domain Files
- **Model**: Core business entities with properties and methods
- **Port**: Interface that defines required operations for infrastructure adapters
- **Service**: Business logic implementation using the domain model and ports
- **Adapter**: Implementation of port interfaces for different infrastructure concerns

### Example Generated Files

For a `create:domain user` command:

```typescript
// src/user/models/User.ts
export class User {
  id: string;
  name: string;
  email: string;
  
  constructor(props: Partial<User>) {
    Object.assign(this, props);
  }
}

// src/user/ports/UserRepositoryPort.ts
import { User } from '../models/User';

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  // Other repository methods...
}

// src/user/services/UserService.ts
import { User } from '../models/User';
import { UserRepositoryPort } from '../ports/UserRepositoryPort';

export class UserService {
  constructor(private readonly repository: UserRepositoryPort) {}
  
  async createUser(userData: Partial<User>): Promise<User> {
    const user = new User(userData);
    return this.repository.save(user);
  }
  
  // Other service methods...
}

// src/infra/repository/UserRepositoryAdapter.ts
import { User } from '../../user/models/User';
import { UserRepositoryPort } from '../../user/ports/UserRepositoryPort';

export class UserRepositoryAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<User | null> {
    // Implementation details...
  }
  
  async save(user: User): Promise<User> {
    // Implementation details...
  }
  
  // Other repository methods...
}
```

## Path Handling

When specifying a custom output path with the `--path` option, all generated files will be placed under the specified directory, maintaining the correct folder structure:

```bash
vss-api-cli create:domain payments --path test-output --yes
```

Will create:
```
test-output/
└── src/
    ├── payments/
    │   ├── models/
    │   │   └── Payments.ts
    │   ├── ports/
    │   │   └── PaymentsRepositoryPort.ts
    │   └── services/
    │       └── PaymentsService.ts
    └── infra/
        └── repository/
            └── PaymentsRepositoryAdapter.ts
```

## Command Help System

Each command includes a detailed help system. Use `--help` with any command to see detailed usage instructions:

```bash
vss-api-cli create:service --help
```



## configuration file

```
{
  "basePath": "src",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{name}}.handler.ts",
      "schemaFile": "{{pascalName}}Schema.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    },
    "domain": {
      "modelFile": "{{pascalName}}.ts",
      "serviceFile": "{{pascalName}}Service.ts",
      "portFile": "{{pascalName}}{{adapterType}}Port.ts",
      "adapterFile": "{{pascalName}}{{adapterType}}Adapter.ts"
    },
    "service": {
      "serviceFile": "{{pascalName}}Service.ts"
    },
    "port": {
      "portFile": "{{pascalName}}Port.ts",
      "adapterFile": "{{pascalName}}Adapter.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "functions", 
      "schema": "functions/schemas"
    },
    "domain": {
      "base": "{{domainName}}",
      "model": "{{domainName}}/models",
      "service": "{{domainName}}/services",
      "port": "{{domainName}}/ports"
    },
    "adapter": {
      "base": "infrastructure/{{adapterType}}"
    },
    "service": {
      "base": "{{domainName}}/services"
    },
    "port": {
      "base": "{{domainName}}/ports"
    }
  }
}
```

alias vss-api-cli= '/Users/javierbenavides/others/dev/poc/vss-ol-cli/dist/index.js'




for DTO zod schemas, offer to create Request and Response DTO's
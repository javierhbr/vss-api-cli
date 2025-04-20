# VSS-OL-CLI

A CLI tool for scaffolding Middy-based serverless projects with hexagonal architecture. This tool helps you quickly generate handlers, domains, ports, and services following best practices.

## Installation

### Global Installation

```bash 
npm install -g vss-ol-cli
```

### Local Installation

```bash
npm install --save-dev vss-ol-cli
```

## Usage

The CLI provides commands to generate different components:

```bash
vss-ol-cli generate <schematic> [name] [options]
```

Or use the shorthand alias:

```bash
vss-ol-cli g <schematic> [name] [options]
```

You can also use the specific creation commands:

```bash
vss-ol-cli create:<component> <name> [options]
```

## Commands and Options

### Handler Generator (`create:handler` or `ch`)

Creates a new Middy handler with optional schema validation.

```bash
vss-ol-cli create:handler <name> [options]
# or
vss-ol-cli ch <name> [options]
```

**Options:**
- `-p, --path <outputPath>` - Specify a custom output path (default: `src/handlers`)
- `-s, --schema` - Generate a Zod schema file for input validation
- `-y, --yes` - Skip confirmation prompts and use default options
- `--no-validation` - Skip schema validation setup

**Examples:**
```bash
# Basic handler creation
vss-ol-cli create:handler createUser

# Handler with schema validation
vss-ol-cli create:handler createUser --schema

# Handler in custom path with schema
vss-ol-cli create:handler createUser -p src/functions -s

# Non-interactive creation
vss-ol-cli create:handler createUser -y

# Handler without validation
vss-ol-cli create:handler createUser --no-validation
```

### Domain Generator (`create:domain` or `cd`)

Creates a new domain with models, services, and ports.

```bash
vss-ol-cli create:domain <domainName> [options]
# or
vss-ol-cli cd <domainName> [options]
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
vss-ol-cli create:domain user

# Domain with custom path
vss-ol-cli create:domain payment --path src/domains

# Domain with REST adapter
vss-ol-cli create:domain product --adapter-type rest

# Domain without model
vss-ol-cli create:domain order --no-model

# Domain with specific components
vss-ol-cli create:domain catalog --no-port --no-service

# Non-interactive with defaults
vss-ol-cli create:domain user -y

# Complete custom setup
vss-ol-cli create:domain payment --adapter-type graphql --path custom/path --no-model
```

### Port Generator (`create:port` or `cp`)

Creates a new port interface and its infrastructure adapter implementation.

```bash
vss-ol-cli create:port <name> [options]
# or
vss-ol-cli cp <name> [options]

Creates a new domain service.

```bash
vss-ol-cli create:service <name> [options]
# or
vss-ol-cli cs <name> [options]
```

**Options:**
- `--domain` (`-d`): Specify the domain name the service belongs to
- `--path <outputPath>`: Specify a custom output path

**Example:**
```bash
vss-ol-cli create:service UserCreator -d user
```

This creates:
- `<outputPath>/src/user/services/UserCreatorService.ts`

## Interactive Prompts

If you don't specify required options, the CLI will prompt you for the needed information interactively. For automated workflows, you can use the `--yes` flag to skip prompts and use default values.

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

## Path Handling

When specifying a custom output path with the `--path` option, all generated files will be placed under the specified directory, maintaining the correct folder structure:

```bash
vss-ol-cli create:domain payments --path test-output --yes
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
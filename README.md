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

## Available Schematics

### Handler Generator

Creates a new Middy handler with optional schema validation.

```bash
vss-ol-cli create:handler <name> [options]
# or
vss-ol-cli ch <name> [options]
```

**Options:**
- `--schema` (`-s`): Generate a Zod schema file for input validation
- `--path <outputPath>`: Specify a custom output path (default: `src/handlers`)

**Example:**
```bash
vss-ol-cli create:handler createUser --schema
```

This creates:
- `src/handlers/createUser.handler.ts`
- `src/handlers/createUserSchema.ts` (if --schema is specified)

### Domain Generator

Creates a new domain with models, services, and ports.

```bash
vss-ol-cli create:domain <domainName> [options]
# or
vss-ol-cli cd <domainName> [options]
```

**Options:**
- `--path <outputPath>`: Specify a custom output path (default: `src/<domainName>`)
- `--yes`: Skip prompts and use default options (useful for scripting)
- `--no-model`: Skip model generation
- `--no-service`: Skip service generation
- `--no-port`: Skip port generation
- `--adapter-type <type>`: The type of adapter for the port (options: repository, rest, graphql, none; default: repository)

**Example:**
```bash
# Interactive mode
vss-ol-cli create:domain user
  
# Non-interactive with custom path
vss-ol-cli create:domain payments --path custom-output --yes
  
# Custom options
vss-ol-cli create:domain product --adapter-type=rest --no-model
```

This creates:
- `<outputPath>/src/<domainName>/models/<DomainName>.ts`
- `<outputPath>/src/<domainName>/ports/<DomainName><AdapterType>Port.ts`
- `<outputPath>/src/infra/<adapterType>/<DomainName><AdapterType>Adapter.ts`
- `<outputPath>/src/<domainName>/services/<DomainName>Service.ts`

### Port Generator

Creates a new port interface in a domain and its adapter implementation.

```bash
vss-ol-cli create:port <name> [options]
# or
vss-ol-cli cp <name> [options]
```

**Options:**
- `--domain` (`-d`): The domain this port belongs to
- `--adapterType` (`-t`): The type of adapter that will implement this port (options: repository, rest, graphql; default: repository)
- `--path <outputPath>`: Specify a custom output path

**Example:**
```bash
vss-ol-cli create:port UserFinder -d user -t repository
```

This creates:
- `<outputPath>/src/user/ports/UserFinderPort.ts`
- `<outputPath>/src/infra/repository/UserFinderAdapter.ts`

### Service Generator

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
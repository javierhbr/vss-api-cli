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

## Available Schematics

### Handler Generator

Creates a new Middy handler with optional schema validation.

```bash
vss-ol-cli g handler <name> [options]
# or
vss-ol-cli generate handler <name> [options]
```

**Options:**
- `--schema` (`-s`): Generate a Zod schema file for input validation
- `--path`: Specify a custom output path (default: `src/handlers`)

**Example:**
```bash
vss-ol-cli g handler createUser --schema
```

This creates:
- `src/handlers/createUser.handler.ts`
- `src/handlers/createUserSchema.ts` (if --schema is specified)

### Domain Generator

Creates a new domain with models, services, and ports.

```bash
vss-ol-cli g domain <name> [options]
# or
vss-ol-cli generate domain <name> [options]
```

**Options:**
- `--model`: Generate a domain model file (default: true)
- `--service`: Generate a domain service file (default: true)
- `--port`: Generate a domain port interface and its adapter (default: true)
- `--adapterType`: The type of adapter for the port (options: repository, rest, graphql, none; default: repository)
- `--path`: Specify a custom output path (default: `src/<domainName>`)

**Example:**
```bash
vss-ol-cli g domain user --adapterType=rest
```

This creates:
- `src/user/models/User.ts`
- `src/user/ports/UserRestPort.ts`
- `src/infra/rest/UserRestAdapter.ts`
- `src/user/services/UserService.ts`

### Port Generator

Creates a new port interface in a domain and its adapter implementation.

```bash
vss-ol-cli g port <name> [options]
# or
vss-ol-cli generate port <name> [options]
```

**Options:**
- `--domain` (`-d`): The domain this port belongs to
- `--adapterType` (`-t`): The type of adapter that will implement this port (options: repository, rest, graphql; default: repository)
- `--path`: Specify a custom output path

**Example:**
```bash
vss-ol-cli g port UserFinder -d user -t repository
```

This creates:
- `src/user/ports/UserFinderPort.ts`
- `src/infra/repository/UserFinderAdapter.ts`

### Service Generator

Creates a new domain service.

```bash
vss-ol-cli g service <name> [options]
# or
vss-ol-cli generate service <name> [options]
```

**Options:**
- `--domain` (`-d`): Specify the domain name the service belongs to

**Example:**
```bash
vss-ol-cli g service UserCreator -d user
```

This creates:
- `src/user/services/UserCreatorService.ts`

## Interactive Prompts

If you don't specify required options, the CLI will prompt you for the needed information interactively.

## Project Structure

The CLI generates files following this structure:

```
src/
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
---
sidebar_position: 2
---

# Domain Generator (`create:domain` or `cd`)

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

## Generated Files

- **Model**: Core business entities with properties and methods.
- **Port**: Interface that defines required operations for infrastructure adapters.
- **Service**: Business logic implementation using the domain model and ports.
- **Adapter**: Implementation of port interfaces for different infrastructure concerns (created within `infra/` based on `--adapter-type`).
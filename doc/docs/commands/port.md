---
sidebar_position: 3
---

# Port Generator (`create:port` or `cp`)

Creates a new port interface and its infrastructure adapter implementation.

```bash
vss-api-cli create:port <name> [options]
# or
vss-api-cli cp <name> [options]
```

**Options:**
- `-p, --path <outputPath>` - Specify a custom output path (default: `src/ports` for the interface, `src/infra/...` for the adapter)
- `-d, --domain <domainName>` - Specify the domain name the port belongs to
- `-y, --yes` - Skip prompts and use default options

**Examples:**
```bash
# Basic port creation
vss-api-cli create:port userRepository

# Port with custom path (affects interface location)
vss-api-cli create:port userRepository --path src/custom-ports

# Port for a specific domain
vss-api-cli create:port userRepository --domain user

# Non-interactive creation
vss-api-cli create:port userRepository -y
```

## Generated Files

- **Port Interface**: Defines the contract within the specified domain's `ports/` directory (or custom path).
- **Adapter Implementation**: A basic adapter implementation is created within the corresponding `infra/` subdirectory (e.g., `infra/repository/`).
---
sidebar_position: 1
---

# Handler Generator (`create:handler` or `ch`)

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

## Generated Files

- **Handler File**: Contains the main API handler function, with proper error handling and response formatting.
- **Schema File**: Contains Zod validation schema for request validation (when using `--schema` option).
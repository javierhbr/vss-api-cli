---
sidebar_position: 4
---

# Service Generator (`create:service` or `cs`)

Creates a new domain service.

```bash
vss-api-cli create:service <name> [options]
# or
vss-api-cli cs <name> [options]
```

**Options:**
- `--domain` (`-d`): Specify the domain name the service belongs to
- `--path <outputPath>`: Specify a custom output path (overrides default domain path)

**Example:**
```bash
vss-api-cli create:service UserCreator -d user
```

This creates:
- `src/user/services/UserCreatorService.ts` (if no path is specified)
- `<outputPath>/<ServiceName>.ts` (if path is specified)

## Generated Files

- **Service File**: Contains the class definition for the domain service within the specified domain's `services/` directory (or custom path).
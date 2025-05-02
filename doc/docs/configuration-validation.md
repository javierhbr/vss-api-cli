## Configuration Validation and Best Practices

The VSS-API-CLI includes tools to help you validate and maintain consistency in your configuration files.

### File Naming Case Configuration

The `fileNameCase` setting in your `vss-api.config.json` controls how generated files are named. For best results, use template variables that match your chosen case style:

| `fileNameCase` | Recommended Template Variable |
|----------------|------------------------------|
| `pascal` | `{{pascalName}}` |
| `camel` | `{{camelName}}` |
| `kebab` | `{{dashName}}` |
| `snake` | `{{snakeName}}` |

### Validation Tool

The CLI includes a validation script that helps ensure your configuration is consistent:

```bash
# Check all configuration files in the current project
./node_modules/.bin/vss-api-cli-validate-naming

# Validate a specific configuration file
./node_modules/.bin/vss-api-cli-validate-naming ./path/to/vss-api.config.json

# Auto-fix inconsistencies (creates backups)
./node_modules/.bin/vss-api-cli-validate-naming --fix
```

This tool checks that the `fileNameCase` setting in your configuration aligns with the template variables used in your file patterns.

### Common Issues and Solutions

1. **Inconsistent template variables**: When your `fileNameCase` is set to one style (e.g., `kebab`), but your file patterns use template variables for a different style (e.g., `{{pascalName}}`).

   ```json
   // Inconsistent
   {
     "fileNameCase": "kebab",
     "filePatterns": {
       "handler": {
         "handlerFile": "{{pascalName}}.handler.ts" // Should use {{dashName}}
       }
     }
   }
   ```

2. **Missing template variables**: Using plain strings without template variables for file names.

   ```json
   // Missing template variables
   {
     "filePatterns": {
       "handler": {
         "handlerFile": "index.handler.ts" // No template variable used
       }
     }
   }
   ```

Run the validation tool with the `--fix` option to automatically correct these issues.

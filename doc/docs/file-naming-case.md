# File Naming Case

## Overview

The `vss-api-cli` provides flexible control over the case style used in generated files through the `fileNameCase` configuration setting. This document explains how to use this setting effectively and ensure consistency in your project's file patterns.

## Setting the File Naming Case

You can control the case style of generated file names with the `fileNameCase` option in your `vss-api.config.json` file:

```json
{
  "basePath": "src",
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.handler.ts"
    }
  }
}
```

## Available Options

The `vss-api-cli` supports four different case styles:

| Option | Description | Example File Names | Recommended Template Variable |
|--------|-------------|-------------------|------------------------------|
| `pascal` | PascalCase (default) | `Product.ts`, `ProductService.ts` | `{{pascalName}}` |
| `camel` | camelCase | `product.ts`, `productService.ts` | `{{camelName}}` |
| `kebab` | kebab-case | `product.ts`, `product-service.ts` | `{{dashName}}` |
| `snake` | snake_case | `product.ts`, `product_service.ts` | `{{snakeName}}` |

## Template Variables

When using a specific `fileNameCase` setting, it's recommended to use the corresponding template variable in your file patterns:

### Consistent Usage Examples

For `fileNameCase: "pascal"`:
```json
{
  "fileNameCase": "pascal",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{pascalName}}.handler.ts",
      "schemaFile": "{{pascalName}}Schema.ts"
    }
  }
}
```

For `fileNameCase: "kebab"`:
```json
{
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.handler.ts",
      "schemaFile": "{{dashName}}.schema.ts"
    }
  }
}
```

## Maintaining Consistency

Using the matching template variable for your chosen `fileNameCase` ensures consistent file naming throughout your project.

### Why Consistency Matters

When you mix different case variables with your `fileNameCase` setting, it can lead to confusion and inconsistencies:

- **Confusing File Names**: Using `{{pascalName}}` with `fileNameCase: "kebab"` results in inconsistent file naming
- **Maintenance Issues**: Makes it harder to understand the pattern used for generating files
- **Unexpected Results**: The actual file names may not match what developers expect

### Avoiding Common Issues

For example, these configurations may lead to unexpected results:

```json
// Inconsistent - using PascalCase variables with kebab-case setting
{
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{pascalName}}.handler.ts" // Inconsistent
    }
  }
}
```

Instead, use:

```json
// Consistent - using kebab-case variables with kebab-case setting
{
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.handler.ts" // Consistent
    }
  }
}
```

## Validating Configuration

You can use the validation script included with `vss-api-cli` to check your configuration files for consistency:

```bash
./validate-file-cases-fixed.js
```

This script will scan your project for `vss-api.config.json` files and check if the template variables used in your patterns match the `fileNameCase` setting.

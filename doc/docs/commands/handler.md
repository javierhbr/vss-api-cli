---
sidebar_position: 1
---

# How to Create a Handler

This guide explains how to use the `vss-api-cli` to generate a new API handler with optional schema validation.

## Steps

1. **Run the Command**  
   Use the following command to create a handler:
   ```bash
   vss-api-cli create:handler <name> [options]
   # or
   vss-api-cli ch <name> [options]
   ```

2. **Options**  
   Customize the handler generation using these options:
   - `-p, --path <outputPath>`: Specify a custom output path for the handler.
   - `-s, --schema`: Generate schema validation files.
   - `--no-validation`: Skip schema validation setup.

3. **Examples**  
   To create a handler named `createUser` with schema validation:
   ```bash
   vss-api-cli create:handler createUser --schema
   ```

   To create a handler in a custom path with schema:
   ```bash
   vss-api-cli create:handler createUser -p src/functions -s
   ```

   To create a handler without validation:
   ```bash
   vss-api-cli create:handler createUser --no-validation
   ```

4. **Generated Structure**  
   The command generates the following structure:
   ```
   src/
   ├── functions/
   │   ├── create-user.function.ts
   │   ├── schemas/
   │   │   └── create-user.schema.ts
   ```
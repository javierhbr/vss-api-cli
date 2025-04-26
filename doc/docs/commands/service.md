---
sidebar_position: 4
---

# How to Create a Service

This guide explains how to use the `vss-api-cli` to generate a new domain service.

## Steps

1. **Run the Command**  
   Use the following command to create a service:
   ```bash
   vss-api-cli create:service <name> [options]
   # or
   vss-api-cli cs <name> [options]
   ```

2. **Options**  
   Customize the service generation using these options:
   - `--domain` (`-d`): Specify the domain name the service belongs to.
   - `--path <outputPath>`: Specify a custom output path (overrides default domain path).

3. **Example**  
   To create a service named `UserCreator` for the `user` domain:
   ```bash
   vss-api-cli create:service UserCreator -d user
   ```

4. **Generated Structure**  
   The command generates the following structure:
   ```
   src/
   ├── user/
   │   ├── services/
   │   │   └── UserCreatorService.ts
   ```
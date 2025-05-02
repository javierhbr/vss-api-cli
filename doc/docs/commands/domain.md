---
sidebar_position: 2
---

# How to Create a Domain

This guide explains how to use the `vss-api-cli` to generate a new domain with models, services, and ports, following clean architecture principles.

## Steps

1. **Run the Command**  
   Use the following command to create a domain:  
   ```bash
   vss-api-cli create:domain <domainName> [options]
   # or
   vss-api-cli cd <domainName> [options]
   ```

2. **Options**  
   Customize the domain generation using these options:  
   - `-p, --path <outputPath>`: Specify a custom output path (default: `src/<domainName>`).
   - `-y, --yes`: Skip prompts and use default options.
   - `--no-model`: Skip model generation.
   - `--no-service`: Skip service generation.
   - `--no-port`: Skip port generation.
   - `--adapter-type <type>`: Specify the adapter type (e.g., `repository`, `rest`, `graphql`, or `none`).

3. **Examples**  
   To create a domain named `user` with default settings:  
   ```bash
   vss-api-cli create:domain user
   ```

   To create a domain with a custom path:  
   ```bash
   vss-api-cli create:domain payment --path src/domains
   ```

   To create a domain with a REST adapter:  
   ```bash
   vss-api-cli create:domain product --adapter-type rest
   ```

   To create a domain without model:  
   ```bash
   vss-api-cli create:domain order --no-model
   ```

   To create a domain with specific components:  
   ```bash
   vss-api-cli create:domain catalog --no-port --no-service
   ```

   For a non-interactive setup with defaults:  
   ```bash
   vss-api-cli create:domain user -y
   ```

   For a complete custom setup:  
   ```bash
   vss-api-cli create:domain payment --adapter-type graphql --path custom/path --no-model
   ```

4. **Generated Structure**  
   The command generates the following structure:  
   ```
   src/
   ├── user/
   │   ├── models/
   │   │   └── User.ts
   │   ├── ports/
   │   │   └── UserRepositoryPort.ts
   │   └── services/
   │       └── UserService.ts
   └── infra/
       └── repository/
           └── UserRepositoryAdapter.ts
   ```
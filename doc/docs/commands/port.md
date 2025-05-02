---
sidebar_position: 3
---

# How to Create a Port

This guide explains how to use the `vss-api-cli` to generate a new port interface and its infrastructure adapter implementation.

## Steps

1. **Run the Command**  
   Use the following command to create a port:  
   ```bash
   vss-api-cli create:port <name> [options]
   # or
   vss-api-cli cp <name> [options]
   ```

2. **Options**  
   Customize the port generation using these options:  
   - `-p, --path <outputPath>`: Specify a custom output path (default: `src/ports` for the interface, `src/infra/...` for the adapter).
   - `-d, --domain <domainName>`: Specify the domain name the port belongs to.
   - `-y, --yes`: Skip prompts and use default options.

3. **Example**  
   To create a port named `userRepository` for the `user` domain:  
   ```bash
   vss-api-cli create:port userRepository --domain user
   ```

   To create a port with a custom path:  
   ```bash
   vss-api-cli create:port userRepository --path src/adapters
   ```

4. **Generated Structure**  
   The command generates the following structure:  
   ```
   src/
   ├── user/
   │   ├── ports/
   │   │   └── UserRepositoryPort.ts
   └── infra/
       └── repository/
           └── UserRepositoryAdapter.ts
   ```
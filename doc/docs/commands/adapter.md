---
sidebar_position: 5
---

# How to Create an Adapter

This guide explains how to use the `vss-api-cli` to generate an adapter for your project, following clean architecture principles.

## Steps

1. **Run the Command**
   Use the following command to create an adapter:
   ```bash
   vss-api-cli create:adapter <name> [options]
   # or
   vss-api-cli ca <name> [options]
   ```

2. **Options**
   Customize the adapter generation using these options:
   - `-p, --path <outputPath>`: Specify a custom output path for the adapter.
   - `-t, --type <adapterType>`: Specify the adapter type (e.g., `repository`, `rest`, `graphql`).
   - `-d, --domain <domainName>`: Specify the domain name the adapter belongs to.
   - `-y, --yes`: Skip prompts and use default options.

3. **Example**
   To create a repository adapter for the `user` domain:
   ```bash
   vss-api-cli create:adapter userRepository --type repository --domain user
   ```

   To create a REST adapter with a custom path:
   ```bash
   vss-api-cli create:adapter userRestAdapter --type rest --path src/adapters/rest
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

## Using Zod DTOs in Adapters

Adapters often require data validation and transformation. The `vss-api-cli` supports generating Zod DTOs (Data Transfer Objects) to simplify this process.

### Steps to Use Zod DTOs

1. **Generate the Adapter**
   When creating an adapter, include the `--schema` option to generate Zod DTOs:
   ```bash
   vss-api-cli create:adapter userRepository --type repository --domain user --schema
   ```

2. **Generated Zod DTOs**
   The command generates Zod schemas alongside the adapter. For example:
   ```
   src/
   ├── infra/
   │   └── repository/
   │       ├── UserRepositoryAdapter.ts
   │       └── UserRepositorySchema.ts
   ```

3. **Using the Zod DTOs**
   Import the Zod schema in your adapter to validate and transform data:
   ```typescript
   import { UserRepositorySchema } from './UserRepositorySchema';

   export class UserRepositoryAdapter {
       save(data: unknown) {
           const validatedData = UserRepositorySchema.parse(data);
           // Use validatedData for further processing
       }
   }
   ```

4. **Customizing Zod DTOs**
   You can modify the generated Zod schemas to fit your specific requirements. For example:
   ```typescript
   import { z } from 'zod';

   export const UserRepositorySchema = z.object({
       id: z.string().uuid(),
       name: z.string().min(1),
       email: z.string().email(),
   });
   ```

### Benefits of Using Zod DTOs
- **Validation**: Ensure data integrity by validating inputs.
- **Transformation**: Automatically transform data into the required format.
- **Type Safety**: Leverage TypeScript types generated from Zod schemas.

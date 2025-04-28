# File Naming Case Example

This example demonstrates how to control the case style of generated filenames:

```json
{
  "basePath": "src",
  "fileNameCase": "camel",
  "directories": {
    "domain": {
      "base": "modules/{{domainName}}"
    }
  }
}
```

With this configuration:
- When running `vss-api-cli create:domain user`, the model file will be named `user.ts` instead of `User.ts`
- All generated files will use camelCase filenames
- Classes and interfaces inside the files still have appropriate naming conventions

## Example Output with Different Settings:

### With `fileNameCase: "camel"`
```
src/
└── modules/
    └── user/
        ├── models/
        │   └── user.ts                  // File name is camelCase
        ├── services/
        │   └── userService.ts           // File name is camelCase 
        └── ports/
            └── userRepositoryPort.ts    // File name is camelCase
```

### With `fileNameCase: "pascal"` (default)
```
src/
└── modules/
    └── user/
        ├── models/
        │   └── User.ts                  // File name is PascalCase
        ├── services/
        │   └── UserService.ts           // File name is PascalCase 
        └── ports/
            └── UserRepositoryPort.ts    // File name is PascalCase
```

### With `fileNameCase: "kebab"`
```
src/
└── modules/
    └── user/
        ├── models/
        │   └── user.ts                   // File name is lowercase
        ├── services/
        │   └── user-service.ts           // File name is kebab-case
        └── ports/
            └── user-repository-port.ts   // File name is kebab-case
```

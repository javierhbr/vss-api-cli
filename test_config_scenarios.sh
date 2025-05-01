#!/bin/zsh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
BASE_TEST_DIR="configuration-test"
TIMESTAMP=$(date +%s)
TEST_ROOT_REL="${BASE_TEST_DIR}/test-config-validation-${TIMESTAMP}" # Relative path for creation
LOG_FILE_REL="${TEST_ROOT_REL}/test_run_${TIMESTAMP}.log"

# --- Initial Setup & Logging ---
# Ensure the base test directory exists
mkdir -p "$BASE_TEST_DIR"

# Create the unique test directory for this run
mkdir -p "$TEST_ROOT_REL"

# Get absolute paths for logging clarity
TEST_ROOT_ABS=$(cd "$TEST_ROOT_REL" && pwd)
LOG_FILE_ABS=$(cd "$(dirname "$LOG_FILE_REL")" && pwd)/$(basename "$LOG_FILE_REL")

# Create/Clear the log file
: > "$LOG_FILE_ABS" # Ensure log file is empty at the start

echo "🚀 Starting Configuration Scenario Tests..." | tee -a "$LOG_FILE_ABS"
echo "🪵 Logging output to: ${LOG_FILE_ABS}" | tee -a "$LOG_FILE_ABS"

# --- Helper Functions (Modified to use tee) ---
print_header() {
  echo "\n==================================================" | tee -a "$LOG_FILE_ABS"
  echo " $1" | tee -a "$LOG_FILE_ABS"
  echo "==================================================" | tee -a "$LOG_FILE_ABS"
}

print_pass() {
  echo "✅ PASS: $1" | tee -a "$LOG_FILE_ABS"
}

print_fail() {
  echo "❌ FAIL: $1" | tee -a "$LOG_FILE_ABS"
  # Optionally: exit 1 # Uncomment to stop script on first failure
}

check_file_exists() {
  local file_path=$1
  local test_desc=$2
  if [[ -f "$file_path" ]]; then
    print_pass "$test_desc ($file_path)" # Already uses tee via print_pass
  else
    print_fail "$test_desc - File not found: $file_path" # Already uses tee via print_fail
    # Also log the directory listing attempt
    echo "Directory contents:" | tee -a "$LOG_FILE_ABS"
    (ls -R "$(dirname "$file_path")" 2>/dev/null || echo " (Directory not found or empty)") | tee -a "$LOG_FILE_ABS"
  fi
}

# --- Test Execution ---
print_header "Starting Configuration Scenario Tests (Run ID: ${TIMESTAMP})"
echo "Test Root Directory: ${TEST_ROOT_ABS}" | tee -a "$LOG_FILE_ABS"

# Navigate into the unique test directory for this run
cd "$TEST_ROOT_REL"
ORIGINAL_PWD=$(pwd) # Save the root of the test directory for this run

# --- Scenario 1: Basic Config (fileNameCase, filePatterns, directories) ---
print_header "Scenario 1: Basic Config (Kebab Case, Custom Dirs/Patterns)"
SCENARIO_DIR="basic-config"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.function.ts",
      "schemaFile": "{{dashName}}.schema.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "functions",
      "schema": "functions/schemas"
    }
  }
}
EOF

echo "⚙️ Generating handler 'createUser'..." | tee -a "$LOG_FILE_ABS"
# Pipe both stdout and stderr of the npx command to tee
npx vss-api-cli create:handler createUser --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/functions/create-user.function.ts" "Handler file location and name"
check_file_exists "src/functions/schemas/create-user.dto.ts" "DTO file location and name"
# Assuming schemaFile is also generated, adjust if needed
check_file_exists "src/functions/schemas/create-user.schema.ts" "Schema file location and name"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 2: Clean Architecture Config ---
print_header "Scenario 2: Clean Architecture Config"
SCENARIO_DIR="clean-arch"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "pascal",
  "directories": {
    "domain": {
      "base": "core/domain/{{domainName}}",
      "model": "core/domain/{{domainName}}/entities",
      "service": "core/domain/{{domainName}}/use-cases",
      "port": "core/ports/output"
    },
    "handler": {
      "base": "adapters/primary",
      "schema": "adapters/primary/schemas"
    },
    "adapter": {
      "base": "adapters/secondary/{{adapterType}}"
    }
  },
  "filePatterns": {
    "domain": {
      "modelFile": "{{pascalName}}Entity.ts",
      "serviceFile": "{{pascalName}}UseCase.ts",
      "portFile": "I{{pascalName}}Repository.ts"
    },
    "handler": {
      "handlerFile": "{{pascalName}}Controller.ts"
    }
  }
}
EOF

echo "⚙️ Generating domain 'payment'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:domain payment --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating handler 'createPayment'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler createPayment --domain payment --yes 2>&1 | tee -a "$LOG_FILE_ABS" # Assuming handler needs domain context

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/core/domain/payment/entities/PaymentEntity.ts" "Domain entity file"
check_file_exists "src/core/domain/payment/use-cases/PaymentUseCase.ts" "Domain use case file"
check_file_exists "src/core/ports/output/IPaymentRepository.ts" "Domain port file"
check_file_exists "src/adapters/primary/CreatePaymentController.ts" "Handler controller file"
# Assuming adapter is also created by domain command or needs separate call
# check_file_exists "src/adapters/secondary/repository/PaymentRepositoryAdapter.ts" "Adapter file"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 3: AWS Lambda Config ---
print_header "Scenario 3: AWS Lambda Config (Snake Case, Index Files)"
SCENARIO_DIR="aws-lambda"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "snake",
  "filePatterns": {
    "handler": {
      "handlerFile": "index.ts",
      "schemaFile": "schema.ts",
      "dtoFile": "types.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "functions/{{dashName}}",
      "schema": "functions/{{dashName}}"
    }
  }
}
EOF

echo "⚙️ Generating handler 'processPayment'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler processPayment --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/functions/process-payment/index.ts" "Lambda handler file (index.ts)"
check_file_exists "src/functions/process-payment/schema.ts" "Lambda schema file"
check_file_exists "src/functions/process-payment/types.ts" "Lambda types file"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 4: NestJS Style Config ---
print_header "Scenario 4: NestJS Style Config (Kebab Case, Modules)"
SCENARIO_DIR="nestjs-style"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.controller.ts",
      "schemaFile": "{{dashName}}.dto.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    },
    "service": {
      "serviceFile": "{{dashName}}.service.ts"
    },
    "domain": {
       "modelFile": "{{pascalName}}.entity.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "modules/{{domainName}}",
      "schema": "modules/{{domainName}}/dto"
    },
    "service": {
      "base": "modules/{{domainName}}/services"
    },
    "domain": {
      "base": "modules/{{domainName}}",
      "model": "modules/{{domainName}}/entities",
      "service": "modules/{{domainName}}/services"
    }
  }
}
EOF

echo "⚙️ Generating domain 'users'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:domain users --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating handler 'createUser' for domain 'users'..." | tee -a "$LOG_FILE_ABS"
# Removed --domain flag since it's not supported by the create:handler command
npx vss-api-cli create:handler createUser --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating service 'UserManagement' for domain 'users'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:service UserManagement --domain users --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/modules/users/create-user.controller.ts" "NestJS handler controller"
check_file_exists "src/modules/users/dto/create-user.dto.ts" "NestJS handler DTO"
check_file_exists "src/modules/users/entities/User.entity.ts" "NestJS domain entity" # Assuming domain creates model
check_file_exists "src/modules/users/services/user-management.service.ts" "NestJS service"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run


# --- Scenario 5: --output-dir Override ---
print_header "Scenario 5: --output-dir Override"
SOURCE_DIR="output-dir-source"
TARGET_DIR="output-dir-target" # Target directory relative to TEST_ROOT for this run
mkdir -p "$SOURCE_DIR"
# Config in the source directory
cat << EOF > "$SOURCE_DIR/vss-api.config.json"
{
  "basePath": "app",
  "fileNameCase": "pascal"
}
EOF
# Target directory - start clean
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

cd "$SOURCE_DIR" # Run command from source dir

echo "⚙️ Generating handler 'MyOutputTest' with --path ../$TARGET_DIR..." | tee -a "$LOG_FILE_ABS"
# Use relative path from current dir (SOURCE_DIR) to TARGET_DIR
# Changed --output-dir to --path as that's the supported option
npx vss-api-cli create:handler MyOutputTest --path "../$TARGET_DIR" --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
# Expected path is INSIDE the output target, including the basePath from the config
check_file_exists "../$TARGET_DIR/app/handlers/MyOutputTest.handler.ts" "Handler location with --path"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run
# rm -rf "$TARGET_DIR" # Clean up target dir if needed separately

# --- Scenario 6: No Config (Defaults) ---
print_header "Scenario 6: No Config File (Defaults)"
SCENARIO_DIR="no-config"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

echo "⚙️ Generating handler 'DefaultTest' (expecting default basePath 'src' and 'pascal' case)..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler DefaultTest --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
# Assuming default basePath is 'src' and default case is 'pascal'
check_file_exists "src/handlers/DefaultTest.handler.ts" "Handler location with default settings"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 7: Express API Config ---
print_header "Scenario 7: Express API Config (Camel Case, MVC Structure)"
SCENARIO_DIR="express-api"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "camel",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{camelName}}Controller.js",
      "schemaFile": "{{camelName}}Schema.js",
      "dtoFile": "{{camelName}}Model.js"
    },
    "service": {
      "serviceFile": "{{camelName}}Service.js"
    }
  },
  "directories": {
    "handler": {
      "base": "controllers",
      "schema": "schemas"
    },
    "service": {
      "base": "services"
    },
    "domain": {
      "model": "models"
    }
  }
}
EOF

# Create directory structure first to ensure the CLI doesn't have issues with missing dirs
mkdir -p src/controllers src/schemas src/services src/models

echo "⚙️ Generating handler 'userAuthentication'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler userAuthentication --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating service 'jwtAuth'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:service jwtAuth --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/controllers/userAuthenticationController.js" "Express handler controller"
check_file_exists "src/schemas/userAuthenticationSchema.js" "Express handler schema"
check_file_exists "src/services/jwtAuthService.js" "Express service"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 8: Microservices Config ---
print_header "Scenario 8: Microservices Config (Domain-Driven Folder Structure)"
SCENARIO_DIR="microservices"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "services",
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}-controller.ts",
      "schemaFile": "{{dashName}}-schema.ts",
      "dtoFile": "{{dashName}}-dto.ts" 
    },
    "domain": {
      "modelFile": "{{dashName}}-aggregate.ts",
      "serviceFile": "{{dashName}}-service.ts",
      "portFile": "{{dashName}}-repository-interface.ts"
    },
    "adapter": {
      "adapterFile": "{{dashName}}-{{adapterType}}-adapter.ts"
    }
  },
  "directories": {
    "domain": {
      "base": "{{domainName}}/domain",
      "model": "{{domainName}}/domain/model",
      "service": "{{domainName}}/domain/services", 
      "port": "{{domainName}}/domain/ports"
    },
    "handler": {
      "base": "{{domainName}}/api",
      "schema": "{{domainName}}/api/schemas"
    },
    "adapter": {
      "base": "{{domainName}}/infrastructure/adapters/{{adapterType}}"
    }
  }
}
EOF

# Create directories to ensure they exist before generating files
mkdir -p services/order/domain/model services/order/domain/ports services/order/domain/services \
         services/order/api services/order/api/schemas \
         services/order/infrastructure/adapters/repository

echo "⚙️ Generating domain 'order'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:domain order --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating handler 'createOrder' for domain 'order'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler createOrder --domain order --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating adapter 'orderRepository' for domain 'order' with type 'repository'..." | tee -a "$LOG_FILE_ABS" 
npx vss-api-cli create:adapter orderRepository --domain order --adapterType repository --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating service 'orderService' for domain 'order'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:service orderService --domain order --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "services/order/domain/model/order-aggregate.ts" "Order aggregate model"
check_file_exists "services/order/domain/ports/order-repository-interface.ts" "Order repository interface" 
check_file_exists "services/order/domain/services/order-service.ts" "Order service"
check_file_exists "services/order/api/create-order-controller.ts" "Order API controller"
check_file_exists "services/order/api/schemas/create-order-schema.ts" "Order API schema"
check_file_exists "services/order/infrastructure/adapters/repository/order-repository-adapter.ts" "Order repository adapter"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 9: GraphQL API Config ---
print_header "Scenario 9: GraphQL API Config (Apollo Server Structure)"
SCENARIO_DIR="graphql-api"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "camel",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{camelName}}.resolver.ts",
      "schemaFile": "{{camelName}}.graphql",
      "dtoFile": "{{camelName}}.types.ts"
    },
    "service": {
      "serviceFile": "{{camelName}}.service.ts"
    },
    "domain": {
      "modelFile": "{{camelName}}.entity.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "graphql/resolvers",
      "schema": "graphql/schemas"
    },
    "service": {
      "base": "services"
    },
    "domain": {
      "model": "entities"
    }
  }
}
EOF

# Create directory structure first to ensure proper file creation
mkdir -p src/graphql/resolvers src/graphql/schemas src/services src/entities

echo "⚙️ Generating handler 'productQuery'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler productQuery --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating service 'productInventory'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:service productInventory --yes 2>&1 | tee -a "$LOG_FILE_ABS"

# Add domain to test entity creation
echo "⚙️ Generating domain 'product'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:domain product --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
check_file_exists "src/graphql/resolvers/productQuery.resolver.ts" "GraphQL resolver"
check_file_exists "src/graphql/schemas/productQuery.graphql" "GraphQL schema" 
check_file_exists "src/services/productInventory.service.ts" "Product service"
check_file_exists "src/entities/product.entity.ts" "Product entity"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 10: Configuration Inheritance ---
print_header "Scenario 10: Configuration Inheritance (Base + Extended Configs)"
SCENARIO_DIR="config-inheritance"
mkdir -p "$SCENARIO_DIR"
cd "$SCENARIO_DIR"

# Create a base config directory structure
mkdir -p "base-config"
cat << EOF > "base-config/vss-api.config.json"
{
  "basePath": "src",
  "fileNameCase": "pascal",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{pascalName}}Handler.ts"
    },
    "service": {
      "serviceFile": "{{pascalName}}Service.ts"
    }
  },
  "directories": {
    "handler": {
      "base": "api/handlers"
    },
    "service": {
      "base": "core/services"
    }
  }
}
EOF

# Create an extending config directory
mkdir -p "extended-config"
cat << EOF > "extended-config/vss-api.config.json"
{
  "extends": "../base-config/vss-api.config.json",
  "filePatterns": {
    "domain": {
      "modelFile": "{{pascalName}}Model.ts",
      "portFile": "I{{pascalName}}Repository.ts"
    },
    "adapter": {
      "adapterFile": "{{pascalName}}Adapter.ts"
    }
  },
  "directories": {
    "domain": {
      "model": "domain/models",
      "port": "domain/ports",
      "service": "{{domainName}}/services"
    },
    "adapter": {
      "base": "infra/repository"
    }
  }
}
EOF

cd "extended-config"

# Create directories to ensure they exist before generating files
mkdir -p src/api/handlers src/domain/models src/domain/ports src/infra/repository src/inheritance/services

echo "⚙️ Generating handler 'ConfigTester' from extended config..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:handler ConfigTester --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating domain 'Inheritance' from extended config..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:domain Inheritance --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating service 'InheritanceService' for domain 'Inheritance'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:service InheritanceService --domain Inheritance --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "⚙️ Generating adapter 'InheritanceAdapter'..." | tee -a "$LOG_FILE_ABS"
npx vss-api-cli create:adapter InheritanceAdapter --yes 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Validating..." | tee -a "$LOG_FILE_ABS"
# Test inherited config (from base)
check_file_exists "src/api/handlers/ConfigTesterHandler.ts" "Handler from inherited config"
# Test extended config
check_file_exists "src/domain/models/InheritanceModel.ts" "Domain model from extended config"
check_file_exists "src/domain/ports/IInheritanceRepository.ts" "Domain port from extended config"
check_file_exists "src/inheritance/services/InheritanceService.ts" "Domain service from extended config"
check_file_exists "src/infra/repository/InheritanceAdapter.ts" "Adapter from extended config"

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Scenario 9: File Case Variable Validation ---
print_header "Scenario 9: File Case Variable Validation"

echo "⚙️ Testing config validation script..." | tee -a "$LOG_FILE_ABS"

# Create a directory for testing the validation script
VALIDATION_DIR="validation-test"
mkdir -p "$VALIDATION_DIR"
cd "$VALIDATION_DIR"

# Create a config with inconsistent case variables
cat << EOF > vss-api.config.json
{
  "basePath": "src",
  "fileNameCase": "kebab",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{pascalName}}.handler.ts", 
      "schemaFile": "{{dashName}}.schema.ts",
      "dtoFile": "{{dashName}}.dto.ts"
    },
    "domain": {
      "modelFile": "{{camelName}}.model.ts",
      "portFile": "{{dashName}}Port.ts"
    }
  }
}
EOF

echo "🔍 Running validation script..." | tee -a "$LOG_FILE_ABS"
node ../../validate-file-cases-fixed.js vss-api.config.json 2>&1 | tee -a "$LOG_FILE_ABS"

echo "🔍 Running validation script with --fix flag..." | tee -a "$LOG_FILE_ABS"
node ../../validate-file-cases-fixed.js vss-api.config.json --fix 2>&1 | tee -a "$LOG_FILE_ABS"

# Check that the config was fixed
echo "🔍 Validating fixed config..." | tee -a "$LOG_FILE_ABS"
# Parse the fixed JSON and check if handlerFile now uses dashName
HANDLER_PATTERN=$(node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('vss-api.config.json')); console.log(config.filePatterns.handler.handlerFile);")
DOMAIN_PATTERN=$(node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('vss-api.config.json')); console.log(config.filePatterns.domain.modelFile);")

if [[ "$HANDLER_PATTERN" == *"{{dashName}}"* ]]; then
  print_pass "Handler pattern correctly uses dashName (kebab case) after fix"
else
  print_fail "Handler pattern was not fixed correctly: $HANDLER_PATTERN"
fi

if [[ "$DOMAIN_PATTERN" == *"{{dashName}}"* ]]; then
  print_pass "Domain model pattern correctly uses dashName (kebab case) after fix"
else
  print_fail "Domain model pattern was not fixed correctly: $DOMAIN_PATTERN"
fi

# Test with CLI command if it was built
if [[ -f "../../dist/index.js" ]]; then
  echo "🔍 Testing CLI validation command..." | tee -a "$LOG_FILE_ABS"
  # Create a fresh config with inconsistencies
  cat << EOF > vss-api-cli.config.json
{
  "basePath": "src",
  "fileNameCase": "pascal",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{dashName}}.handler.ts", 
      "schemaFile": "{{pascalName}}Schema.ts"
    }
  }
}
EOF
  node ../../dist/index.js validate-config -p vss-api-cli.config.json 2>&1 | tee -a "$LOG_FILE_ABS"
fi

cd "$ORIGINAL_PWD" # Back to TEST_ROOT for this run

# --- Final Message ---
print_header "Configuration Scenario Tests Finished"
echo "Test artifacts generated in: ${TEST_ROOT_ABS}" | tee -a "$LOG_FILE_ABS"
echo "Full log available at: ${LOG_FILE_ABS}" | tee -a "$LOG_FILE_ABS"

# --- Optional: Print log file location to console after script finishes ---
# This echo runs *after* the main script logic.
echo "\n🪵 Test complete. Log file: ${LOG_FILE_ABS}"
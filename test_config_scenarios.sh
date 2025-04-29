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

# --- Final Message ---
print_header "Configuration Scenario Tests Finished"
echo "Test artifacts generated in: ${TEST_ROOT_ABS}" | tee -a "$LOG_FILE_ABS"
echo "Full log available at: ${LOG_FILE_ABS}" | tee -a "$LOG_FILE_ABS"

# --- Optional: Print log file location to console after script finishes ---
# This echo runs *after* the main script logic.
echo "\n🪵 Test complete. Log file: ${LOG_FILE_ABS}"
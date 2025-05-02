import * as fs from 'fs-extra';
import * as path from 'path';

// Default configuration
const defaultConfig: CliConfig = {
  basePath: 'src',
  fileNameCase: 'pascal' as const,
  filePatterns: {
    handler: {
      handlerFile: '{{dashName}}.handler.ts',
      schemaFile: '{{pascalName}}Schema.ts',
      dtoFile: '{{dashName}}.dto.ts'
    },
    domain: {
      modelFile: '{{pascalName}}.ts',
      serviceFile: '{{pascalName}}Service.ts',
      portFile: '{{pascalName}}{{adapterType}}Port.ts',
      adapterFile: '{{pascalName}}{{adapterType}}Adapter.ts'
    },
    service: {
      serviceFile: '{{pascalName}}Service.ts'
    },
    port: {
      portFile: '{{pascalName}}Port.ts',
      adapterFile: '{{pascalName}}Adapter.ts'
    }
  },
  directories: {
    handler: {
      base: 'handlers',
      schema: 'handlers/schemas'
    },
    domain: {
      base: '{{domainName}}',
      model: '{{domainName}}/models',
      service: '{{domainName}}/services',
      port: '{{domainName}}/ports'
    },
    adapter: {
      base: 'infra/{{adapterType}}'
    },
    service: {
      base: '{{domainName}}/services'
    },
    port: {
      base: '{{domainName}}/ports'
    }
  }
};

export interface ConfigFilePatterns {
  [key: string]: {
    [key: string]: string;
  };
}

export interface ConfigDirectories {
  [key: string]: {
    [key: string]: string;
  };
}

export interface CliConfig {
  basePath: string;
  filePatterns: ConfigFilePatterns;
  directories: ConfigDirectories;
  fileNameCase: 'pascal' | 'camel' | 'kebab' | 'snake';
}

/**
 * Map of file name case to recommended template variable
 */
const caseToVariableMap = {
  'pascal': 'pascalName',
  'camel': 'camelName',
  'kebab': 'dashName',
  'snake': 'snakeName'
};

/**
 * Extracts template variables from a pattern string
 * @param pattern Template pattern string with {{variable}} placeholders
 * @returns Array of variable names found in the pattern
 */
function extractTemplateVars(pattern: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(pattern)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }
  
  return matches;
}

/**
 * Validates that file patterns are consistent with the chosen fileNameCase
 * @param config The configuration object to validate
 * @returns True if consistent, false if inconsistencies found
 */
function validateFileNameCaseConsistency(config: CliConfig): boolean {
  if (!config.fileNameCase) {
    return true; // Nothing to validate if not specified
  }
  
  const recommendedVar = caseToVariableMap[config.fileNameCase];
  let isConsistent = true;
  let warnings = 0;
  
  // Check file patterns for appropriate case variable usage
  Object.entries(config.filePatterns).forEach(([componentType, patterns]) => {
    Object.entries(patterns).forEach(([fileType, pattern]) => {
      const varsInPattern = extractTemplateVars(pattern);
      const caseVars = varsInPattern.filter(v => 
        ['name', 'pascalName', 'camelName', 'dashName', 'snakeName'].includes(v)
      );
      
      if (caseVars.length > 0 && !caseVars.includes(recommendedVar)) {
        console.warn(`⚠️  Warning: ${componentType}.${fileType}: "${pattern}" does not use {{${recommendedVar}}}, which is recommended for fileNameCase: "${config.fileNameCase}"`);
        
        // Show which case-specific variable is being used instead
        caseVars.forEach(v => {
          if (v !== recommendedVar && Object.values(caseToVariableMap).includes(v)) {
            const usedCase = Object.entries(caseToVariableMap).find(([_, value]) => value === v)?.[0];
            console.warn(`   - Using {{${v}}} which is for fileNameCase: "${usedCase}"`);
          }
        });
        
        warnings++;
        isConsistent = false;
      }
    });
  });
  
  if (warnings > 0) {
    console.warn(`⚠️  ${warnings} inconsistencies found between fileNameCase "${config.fileNameCase}" and template variables.`);
    console.warn(`   - Recommended template variable for fileNameCase "${config.fileNameCase}" is {{${recommendedVar}}}.`);
  }
  
  return isConsistent;
}

/**
 * Load configuration from vss-api.config.json, with fallback to defaults
 * @param basePath Base path where to look for the config file
 * @param useAbsolutePath If true, basePath is treated as absolute, otherwise as relative to CWD
 */
export function loadConfig(basePath: string = '.', useAbsolutePath: boolean = false): CliConfig {
  // If basePath is absolute and useAbsolutePath is true, use it directly
  // Otherwise, resolve it relative to CWD
  const configPath = useAbsolutePath && path.isAbsolute(basePath)
    ? path.join(basePath, 'vss-api.config.json')
    : path.join(process.cwd(), basePath, 'vss-api.config.json');
  
  let userConfig: Partial<CliConfig> = {};
  
  console.log(`Looking for config at: ${configPath}`);
  
  try {
    if (fs.existsSync(configPath)) {
      console.log(`Found config file at: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      console.log(`Config content: ${configContent}`);
      
      const rawConfig = JSON.parse(configContent);
      
      // Ensure fileNameCase is valid if present
      if (rawConfig.fileNameCase) {
        const validValues = ['pascal', 'camel', 'kebab', 'snake'];
        if (validValues.includes(rawConfig.fileNameCase)) {
          userConfig.fileNameCase = rawConfig.fileNameCase as 'pascal' | 'camel' | 'kebab' | 'snake';
          console.log(`Using fileNameCase from config: ${userConfig.fileNameCase}`);
        }
      }
      
      // Copy the rest of the config
      if (rawConfig.basePath) userConfig.basePath = rawConfig.basePath;
      if (rawConfig.filePatterns) userConfig.filePatterns = rawConfig.filePatterns;
      if (rawConfig.directories) userConfig.directories = rawConfig.directories;
      
      console.log('🔧 Using configuration from vss-api.config.json');
    } else {
      console.log(`Config file not found at: ${configPath}`);
    }
  } catch (error) {
    console.warn('⚠️ Error loading configuration file, using defaults:', error);
  }

  // Deep merge default and user config
  const finalConfig = deepMerge(defaultConfig, userConfig);

  // Validate file name case consistency
  validateFileNameCaseConsistency(finalConfig);

  return finalConfig;
}

/**
 * Process template variables in config strings
 */
export function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] || '');
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target } as T;
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const k = key as keyof typeof source;
      if (isObject(source[k])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[k] });
        } else {
          const targetKey = key as keyof T;
          output[targetKey] = deepMerge(
            target[targetKey] as object, 
            source[k] as object
          ) as any;
        }
      } else {
        if (key === 'fileNameCase') {
          // Ensure fileNameCase is a valid value
          const validValues = ['pascal', 'camel', 'kebab', 'snake'];
          const value = source[k] as string;
          if (validValues.includes(value)) {
            Object.assign(output, { [key]: value });
          }
        } else {
          Object.assign(output, { [key]: source[k] });
        }
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
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
 * Load configuration from vss-api.config.json, with fallback to defaults
 */
export function loadConfig(basePath: string = '.'): CliConfig {
  const configPath = path.join(process.cwd(), basePath, 'vss-api.config.json');
  let userConfig: Partial<CliConfig> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Ensure fileNameCase is valid if present
      if (rawConfig.fileNameCase) {
        const validValues = ['pascal', 'camel', 'kebab', 'snake'];
        if (validValues.includes(rawConfig.fileNameCase)) {
          userConfig.fileNameCase = rawConfig.fileNameCase as 'pascal' | 'camel' | 'kebab' | 'snake';
        }
      }
      
      // Copy the rest of the config
      if (rawConfig.basePath) userConfig.basePath = rawConfig.basePath;
      if (rawConfig.filePatterns) userConfig.filePatterns = rawConfig.filePatterns;
      if (rawConfig.directories) userConfig.directories = rawConfig.directories;
      
      console.log('🔧 Using configuration from vss-api.config.json');
    }
  } catch (error) {
    console.warn('⚠️ Error loading configuration file, using defaults:', error);
  }

  // Deep merge default and user config
  return deepMerge(defaultConfig, userConfig);
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
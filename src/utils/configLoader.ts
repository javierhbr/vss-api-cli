import * as fs from 'fs-extra';
import * as path from 'path';

// Default configuration
const defaultConfig = {
  basePath: 'src',
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
}

/**
 * Load configuration from vss-api.config.json, with fallback to defaults
 */
export function loadConfig(basePath: string = '.'): CliConfig {
  const configPath = path.join(process.cwd(), basePath, 'vss-api.config.json');
  let userConfig: Partial<CliConfig> = {};
  
  try {
    if (fs.existsSync(configPath)) {
      userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
        Object.assign(output, { [key]: source[k] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
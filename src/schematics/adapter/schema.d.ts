export interface AdapterSchema {
  name: string;
  path?: string;
  domain: string;
  port: string;
  adapterType: 'repository' | 'rest' | 'graphql' | 'queue' | 'storage';
}
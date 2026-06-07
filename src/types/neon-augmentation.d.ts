import '@neondatabase/serverless';

declare module '@neondatabase/serverless' {
  interface NeonQueryFunction<ArrayMode extends boolean, FullResults extends boolean> {
    join(values: any[], separator: string): any;
    query(query: string, values?: any[]): Promise<any>;
  }
}

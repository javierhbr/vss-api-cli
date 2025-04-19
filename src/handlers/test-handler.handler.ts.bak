import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// import { dependencyInjectionMiddleware } from '../middlewares/dependencyInjection'; // Assuming DI middleware exists
// import { {{serviceName}}Service } from '../../{{domainName}}/services/{{serviceName}}Service'; // Import the relevant service

// Define your handler logic here
const baseHandler = async (event: APIGatewayProxyEvent/*, context: any*/): Promise<APIGatewayProxyResult> => {
  // const { {{serviceName}}Service } = context.container; // Access service via DI

  // Example: Access validated body if schema is used
  // const body = event.body;

  // TODO: Implement handler logic using the service

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Handler executed successfully!' }),
  };
};

export const handler = middy(baseHandler)
  .use(httpJsonBodyParser()) // Parses JSON request bodies
  // .use(dependencyInjectionMiddleware()) // Add DI middleware
  // .use(validator({ inputSchema: {{schemaName}} })) // Add Zod validation middleware if schema exists
  .use(httpErrorHandler()); // Handles HTTP errors gracefully

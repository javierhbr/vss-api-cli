import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { PaymentService } from '../../payment/services/PaymentService';


import { Payments2RequestDto, Payments2RequestDtoType, Payments2ResponseDto, Payments2ResponseDtoType } from './schemas/payments2.dto';

// import { dependencyInjectionMiddleware } from '../middlewares/dependencyInjection'; // Uncomment for DI

// Define your handler logic here
const baseHandler = async (event: APIGatewayProxyEvent/*, context: any*/): Promise<APIGatewayProxyResult> => {
  try {

    // Parse and validate the request using Zod
    const requestData = Payments2RequestDto.parse(event.body);



    // Initialize the service
    const service = new PaymentService();
    
    // Call the service method with the request data
    const result = await service.performAction(requestData);


    // Validate the response using Zod
    const responseData = Payments2ResponseDto.parse(result);
    
    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };


  } catch (error) {
    console.error('Error in handler:', error);
    
    if (error.name === 'ZodError') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Validation error', 
          errors: error.errors 
        }),
      };
    }
    
    // Let the httpErrorHandler middleware handle other errors
    throw error;
  }
};

export const handler = middy(baseHandler)
  .use(httpJsonBodyParser()) // Parses JSON request bodies
  // .use(dependencyInjectionMiddleware()) // Uncomment for DI
  .use(httpErrorHandler()); // Handles HTTP errors gracefully

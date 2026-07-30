import { parseEnvironment, type Environment } from '@kele/config';

export const environment: Environment = parseEnvironment(process.env);

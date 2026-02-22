import { AgentRPC } from 'agentrpc';
import { z } from 'zod';

const rpc = new AgentRPC({
  apiSecret: process.env.AGENTRPC_API_SECRET!,
});

const getWeatherSchema = z.object({ location: z.string() });

rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: getWeatherSchema,
  handler: async ({ location }) => {
    return {
      location,
      temperature: '22°C',
      precipitation: 'clear skies',
    };
  },
});

rpc.listen();

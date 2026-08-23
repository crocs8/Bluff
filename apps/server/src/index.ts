import { createBluffServer } from './server.js';

const server = createBluffServer();
const port = Number(process.env.PORT ?? 3001);
server.listen(port).then((actualPort) => {
  console.log(`Bluff server listening on port ${actualPort}`);
});

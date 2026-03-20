import handler from '../backend/dist/handler.js';

export default async function (req: import('http').IncomingMessage, res: import('http').ServerResponse) {
  await handler(req as any, res as any);
}

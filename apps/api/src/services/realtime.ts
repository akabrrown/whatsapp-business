// Dummy hub since WebSockets have been removed for Vercel Serverless migration.
export const hub: {
  log: any[];
  broadcast: (...args: any[]) => void;
  broadcastAdmin: (...args: any[]) => void;
  sendToWhatsApp: (...args: any[]) => void;
  sendToWeb: (...args: any[]) => void;
  attach: (...args: any[]) => void;
  [key: string]: any;
} = {
  log: [] as any[],
  broadcast: (...args: any[]) => { hub.log.push(args); },
  broadcastAdmin: (...args: any[]) => { hub.log.push(args); },
  sendToWhatsApp: (...args: any[]) => { hub.log.push(args); },
  sendToWeb: (...args: any[]) => { hub.log.push(args); },
  attach: (...args: any[]) => {},
};

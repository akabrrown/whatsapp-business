// Dummy hub since WebSockets have been removed for Vercel Serverless migration.
export const hub = {
  log: [] as any[],
  broadcast: (event: any) => { hub.log.push(event); },
  sendToWhatsApp: (num: any, ev: any) => { hub.log.push({ to: num, ...ev }); },
  sendToWeb: (sess: any, ev: any) => { hub.log.push({ to: sess, ...ev }); },
};

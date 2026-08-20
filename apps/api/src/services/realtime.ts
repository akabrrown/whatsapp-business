// Dummy hub since WebSockets have been removed for Vercel Serverless migration.
const dummyFn = (...args: any[]) => {
  (hub as any).log.push(args);
};

export const hub: {
  log: any[];
  broadcast: (...args: any[]) => void;
  broadcastAdmin: (...args: any[]) => void;
  broadcastWeb: (...args: any[]) => void;
  sendToWhatsApp: (...args: any[]) => void;
  sendToWeb: (...args: any[]) => void;
  attach: (...args: any[]) => void;
  [key: string]: any;
} = new Proxy(
  {
    log: [] as any[],
    broadcast: dummyFn,
    broadcastAdmin: dummyFn,
    broadcastWeb: dummyFn,
    sendToWhatsApp: dummyFn,
    sendToWeb: dummyFn,
    attach: () => {},
  },
  {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      return dummyFn;
    },
  }
);

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV?: string;
    }
  }
}

export {};

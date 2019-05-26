import ApplicationInstance from '@ember/application/instance';

declare module '@ember/test-helpers' {
  interface AppContext {
    element: HTMLElement;
    owner: {
      application: ApplicationInstance;
      register: (name: string, obj: any) => void;
      lookup: <T = any>(name: string) => T;
    };
  }

  export function getContext(): AppContext;
}

declare module '@ember/service' {
  interface Registry {
    ['notification-messages']: {
      clear(): void;
      clearAll(): void;
    };
  }
}

declare module 'ember-localforage-adapter/adapters/localforage' {
  const adapter: any;
  export default adapter;
}

declare module 'ember-localforage-adapter/serializers/localforage' {
  const serializer: any;
  export default serializer;
}

declare global {
  interface Assert {
    contains: (source?: string | null, sub?: string, message?: string) => void;
  }

  interface Window {
    Notification: Partial<Notification> & {
      permission: 'denied' | 'granted' | undefined;
    };
    ServiceWorker: {};
  }

  interface Navigator {
    permissions: {
      revoke(opts: any): Promise<void>;
    };
  }
}

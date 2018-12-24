import StoreService from 'ember-data/store';
import Service from '@ember/service';
import { service } from '@ember-decorators/service';

export default class RelayManager extends Service {
  @service store!: StoreService;

  getRelay() {
    // randomly select one that is online?
    return this.populateStoreWithPreconfiguredRelays();
  }

  async getOpenGraph(url: string): Promise<OpenGraphData> {
    const baseUrl = await this.getRelay().og;
    const safeUrl = encodeURIComponent(url);
    const ogUrl = `${baseUrl}?url=${safeUrl}`;
    const response = await fetch(ogUrl, {
      credentials: 'omit',
      referrer: 'no-referrer',
      cache: 'no-cache',
      headers: {
        ['Accept']: 'application/json',
      },
    });

    const json = await response.json();

    return (json || {}).data;
  }

  // TODO: these need to be 'find or create'
  async populateStoreWithPreconfiguredRelays() {
    const relays = await this.store.findAll('relay');

    return relays[0];
  }
}

declare module '@ember/service' {
  interface Registry {
    'relay-manager': RelayManager;
  }
}

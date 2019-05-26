import ApplicationInstance from '@ember/application/instance';

import LFAdapter from 'ember-localforage-adapter/adapters/localforage';
import LFSerializer from 'ember-localforage-adapter/serializers/localforage';
import ApplicationAdapter from 'emberclear/src/data/models/application/adapter';
import ApplicationSerializer from 'emberclear/src/data/models/application/serializer';

export async function up(appInstance: ApplicationInstance) {
  const { storage, storedModels } = await loadData(appInstance);
  const isMigrated = isAlreadyMigrated(storedModels, storage);
  //
  // second, load all the data
  if (isMigrated) {
    console.log('Migration not needed');
    return;
  }

  console.log('migration needed. Converting old data to { json:api } format');
  stubOldAdapters(appInstance);
  await saveRecords(appInstance, storedModels);
}

function stubOldAdapters(appInstance: ApplicationInstance) {
  appInstance.unregister('serializer:application');
  appInstance.unregister('adapter:application');
  appInstance.register('serializer:application', LFSerializer);
  appInstance.register(
    'adapter:application',
    LFAdapter.extend({
      caching: 'none',

      shouldBackgroundReloadRecord() {
        return true;
      },

      shouldBackgroundReloadAll() {
        return true;
      },
    })
  );
}

async function loadData(appInstance: ApplicationInstance) {
  let adapter = appInstance.lookup('adapter:application');
  let namespace = adapter._adapterNamespace();

  let storage = await (window as any).localforage.getItem(namespace);

  // do we even need to do migrations?

  let storedModels = Object.keys(storage);

  return { storedModels, storage };
}

async function isAlreadyMigrated(storedModels: string[], storage: any) {
  let alreadyMigrated = true;

  for (let i = 0; i < storedModels.length; i++) {
    let modelName = storedModels[i];
    let records = storage[modelName].records;
    let ids = Object.keys(records);
    let record = records[ids[0]];

    if (record && record.data && record.data.attributes) {
      alreadyMigrated = true && alreadyMigrated;
    } else {
      alreadyMigrated = false;
    }
  }

  return alreadyMigrated;
}

async function saveRecords(appInstance: ApplicationInstance, storedModels: string[]) {
  let store = appInstance.lookup('service:store');

  for (let i = 0; i < storedModels.length; i++) {
    let modelName = storedModels[i];

    await store.findAll(modelName);
  }

  // third, swap out the adapter/serializer with the new ones
  appInstance.unregister('serializer:application');
  appInstance.unregister('adapter:application');
  appInstance.register('serializer:application', ApplicationSerializer);
  appInstance.register('adapter:application', ApplicationAdapter);

  store = appInstance.lookup('service:store');

  store._adapterCache['user'] = appInstance.lookup('adapter:application');
  store._serializerCache['user'] = appInstance.lookup('serializer:application');

  const user = store.peekRecord('identity', 'me');

  await store
    .createRecord('user', {
      id: 'me',
      privateKey: user.privateKey,
      publicKey: user.publicKey,
      name: user.name,
    })
    .save();

  // finally, save all the data
  for (let i = 0; i < storedModels.length; i++) {
    let modelName = storedModels[i];

    let eRecords = await store.peekAll(modelName);
    let records = eRecords.toArray();

    for (let j = 0; j < records.length; j++) {
      let record = records[j];

      if (record.id === 'me') continue;

      if (modelName === 'identity') {
        modelName = 'contact';

        record = store.createRecord('contact', {
          id: record.id,
          name: record.name,
          publicKey: record.publicKey,
          onlineStatus: record.onlineStatus,
        });
      }

      record.store._adapterCache[modelName] = appInstance.lookup('adapter:application');
      record.store._serializerCache[modelName] = appInstance.lookup('serializer:application');
      // debugger;
      // record.set('id', record.id);
      record.set('hasDirtyAttributes', true);

      await record.save();
    }
  }
}

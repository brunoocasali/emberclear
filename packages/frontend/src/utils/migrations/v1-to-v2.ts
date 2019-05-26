import ApplicationInstance from '@ember/application/instance';

import LFAdapter from 'ember-localforage-adapter/adapters/localforage';
import LFSerializer from 'ember-localforage-adapter/serializers/localforage';
import ApplicationAdapter from 'emberclear/src/data/models/application/adapter';
import ApplicationSerializer from 'emberclear/src/data/models/application/serializer';

/**
 *
 * Migrations:
 *   identities split to user and contacts
 *   - user is the actual user of the app
 *   message relationships were not polymorphic before, and now
 *   will need the sender relationship updated
 *
 *   All other models don't have relationships, so they can just
 *   be resaved.
 *
 *
 *   NOTE: how long should this migration be kept? this'll be just be bloat after it runs.
 *
 */
export async function up(appInstance: ApplicationInstance) {
  const { storage, storedModels } = await loadData(appInstance);
  const isMigrated = isAlreadyMigrated(storedModels, storage);

  // second, load all the data
  if (isMigrated) {
    console.log('Migration not needed');
    return;
  }

  console.log('migration needed. Converting old data to { json:api } format');
  stubOldAdapters(appInstance);
  await saveRecords(appInstance, storedModels);
  await cleanUpRemainingDataAndRelationships(appInstance);
}

async function cleanUpRemainingDataAndRelationships(appInstance: ApplicationInstance) {
  let store = appInstance.lookup('service:store');
  let adapter = appInstance.lookup('adapter:application');
  let namespace = adapter._adapterNamespace();

  let storage = await (window as any).localforage.getItem(namespace);

  delete storage.identity;

  const messages = (storage.message || {}).records || {};
  const ids = Object.keys(messages);

  ids.forEach(id => {
    const record = messages[id];

    const sender = record.data.relationships.sender;

    const isTheUser = sender.data.id === 'me';

    if (isTheUser) {
      storage.message.records[id].data.relationships.sender.data.type = 'users';
    } else {
      storage.message.records[id].data.relationships.sender.data.type = 'contacts';
    }
  });

  store.unloadAll();
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

function isAlreadyMigrated(storedModels: string[], storage: any) {
  let alreadyMigrated = undefined;

  for (let i = 0; i < storedModels.length; i++) {
    let modelName = storedModels[i];
    let records = storage[modelName].records;
    let ids = Object.keys(records);
    let record = records[ids[0]];

    if (record && record.data && record.data.attributes) {
      alreadyMigrated = true && (alreadyMigrated === undefined ? true : alreadyMigrated);
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

  await migrateIdentities(appInstance);
  await migrateMessages(appInstance);
  await migrateEverythingElse(appInstance, storedModels);
}

async function migrateMessages(appInstance: ApplicationInstance) {
  let store = appInstance.lookup('service:store');

  let eRecords = await store.peekAll('message');
  let records = eRecords.toArray();

  for (let j = 0; j < records.length; j++) {
    let record = records[j];

    record.store._adapterCache['message'] = appInstance.lookup('adapter:application');
    record.store._serializerCache['message'] = appInstance.lookup('serializer:application');
    record.set('hasDirtyAttributes', true);

    await record.save();
  }
}

async function migrateEverythingElse(appInstance: ApplicationInstance, storedModels: string[]) {
  let store = appInstance.lookup('service:store');

  for (let i = 0; i < storedModels.length; i++) {
    let modelName = storedModels[i];

    let eRecords = await store.peekAll(modelName);
    let records = eRecords.toArray();

    for (let j = 0; j < records.length; j++) {
      let record = records[j];

      record.store._adapterCache[modelName] = appInstance.lookup('adapter:application');
      record.store._serializerCache[modelName] = appInstance.lookup('serializer:application');
      record.set('hasDirtyAttributes', true);

      await record.save();
    }
  }
}

async function migrateIdentities(appInstance: ApplicationInstance) {
  let store = appInstance.lookup('service:store');

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
  let eRecords = await store.peekAll('identities');
  let records = eRecords.toArray();

  for (let j = 0; j < records.length; j++) {
    let record = records[j];

    if (record.id === 'me') continue;

    record = store.createRecord('contact', {
      id: record.id,
      name: record.name,
      publicKey: record.publicKey,
      onlineStatus: record.onlineStatus,
    });

    record.store._adapterCache['contact'] = appInstance.lookup('adapter:application');
    record.store._serializerCache['contact'] = appInstance.lookup('serializer:application');

    record.set('hasDirtyAttributes', true);

    await record.save();
  }
}

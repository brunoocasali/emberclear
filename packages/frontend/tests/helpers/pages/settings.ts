import { click, find, fillIn } from '@ember/test-helpers';
import { create, collection, clickable, isVisible, fillable } from 'ember-cli-page-object';

const wrapper = '[data-test-settings-wrapper]';

export const page = create({
  relays: {
    addRelay: clickable('[data-test-add-relay]'),
    form: {
      scope: '[data-test-add-relay-form]',
      isVisible: isVisible(),
      fillSocket: fillable('[data-test-socket-field]'),
      fillOg: fillable('[data-test-og-field]'),
      save: clickable('[data-test-save-relay]'),
    },
    table: {
      rows: collection('[data-test-relays] tbody tr'),
    },
  },
});

export const settings = {
  save: () => click(`${wrapper} [data-test-save]`),
  fillNameField: (text: string) => fillIn(`${wrapper} [data-test-name-field]`, text),

  deleteMessages: () => click(`${wrapper} [data-test-delete-messages]`),

  togglePrivateKey: () => click(`${wrapper} [data-test-show-private-key-toggle]`),

  privateKeyText: () => find(`${wrapper} [data-test-mnemonic]`),

  toggleHideOfflineContacts: () => click(`${wrapper} [data-test-hide-offline-contacts]`),
};

export default {
  settings,
};

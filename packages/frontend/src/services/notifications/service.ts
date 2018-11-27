import Service, { Registry } from '@ember/service';
import { computed } from '@ember-decorators/object';
import { service } from '@ember-decorators/service';

import IdentityService from 'emberclear/src/services/identity/service';

import { syncToLocalStorage, disableInFastboot } from 'emberclear/src/utils/decorators';

import Toast from 'emberclear/src/services/toast';

export default class Notifications extends Service {
  @service toast!: Toast;
  @service intl!: Intl;
  @service identity!: IdentityService;
  @service router!: Registry['router'];

  askToEnableNotifications = true;
  isHiddenUntilBrowserRefresh = false;



  @disableInFastboot
  @syncToLocalStorage
  get isNeverGoingToAskAgain() {
    return false;
  }

  @computed(
    'askToEnableNotifications',
    'isHiddenUntilBrowserRefresh',
    'isNeverGoingToAskAgain',
    'identity.isLoggedIn',
    'notInSetup',
    'router.currentRouteName'
  )
  get showInAppPrompt() {
    if (!this.identity.isLoggedIn) return false;
    if (this.router.currentRouteName.match(/setup/)) return false;
    if (this.router.currentRouteName.match(/logout/)) return false;
    if (!this.isBrowserCapableOfNotifications()) return false;
    if (this.isPermissionGranted()) return false;
    if (this.isPermissionDenied()) return false;
    if (this.isNeverGoingToAskAgain) return false;
    if (this.isHiddenUntilBrowserRefresh) return false;

    return this.askToEnableNotifications;
  }

  info(msg: string, title = '', options = {}) {
    return this.display('is-info', msg, title, options);
  }

  success(msg: string, title = '', options = {}) {
    return this.display('is-success', msg, title, options);
  }

  warning(msg: string, title = '', options = {}) {
    return this.display('is-warning', msg, title, options);
  }

  error(msg: string, title = '', options = {}) {
    return this.display('is-danger', msg, title, options);
  }

  async display(status: string, msg: string, title: string, options = {}) {
    if (this.isPermissionGranted()) {
      this.showNotification(msg, title, options);
      return;
    }

    // Permission to display desktop notifications has not yet been granted.
    // ask the user if they would like to enable those.
    this.set('askToEnableNotifications', true);


    this.toast.createToast(status, msg, title, options);
  }

  isPermissionGranted() {
    if (this.isBrowserCapableOfNotifications()) {
      return Notification.permission === 'granted';
    }

    return false;
  }

  isPermissionDenied() {
    return Notification.permission === 'denied';
  }

  askPermission() {
    return new Promise((resolve, reject) => {
      if (!this.isBrowserCapableOfNotifications()) return reject();
      if (this.isPermissionDenied()) return reject();

      Notification.requestPermission(permission => {
        if (permission === 'granted') {
          this.set('askToEnableNotifications', false);

          return resolve();
        }

        return reject();
      });
    });
  }

  isBrowserCapableOfNotifications() {
    return ('Notification' in window);
  }

  showNotification(msg: string, title = '', options = {}) {
    const defaultTitle = this.intl.t('ui.notifications.title');
    const notificationOptions = {
      body: msg,
      // icon: ''
      ...options
    };

    return new Notification(title || defaultTitle, notificationOptions);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'notifications': Notifications;
  }
}

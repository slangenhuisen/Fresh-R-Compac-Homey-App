'use strict';

const Homey = require('homey');

class FreshRApp extends Homey.App {

  async onInit() {
    this.log('Fresh-R Compac app has been initialized');
  }

}

module.exports = FreshRApp;

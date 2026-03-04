'use strict';

const Homey = require('homey');

class FreshRDriver extends Homey.Driver {

  async onInit() {
    this.log('Fresh-R Compac driver has been initialized');
  }

  async onPair(session) {
    let ipAddress = '';

    session.setHandler('connect', async (data) => {
      ipAddress = data.ip.trim();

      // Validate by fetching /diagnostics
      await this._fetchDiagnostics(ipAddress);
      return true;
    });

    session.setHandler('list_devices', async () => {
      return [
        {
          name: `Fresh-R Compac (${ipAddress})`,
          data: {
            id: `freshr-compac-${ipAddress.replace(/\./g, '-')}`,
          },
          settings: {
            ip_address: ipAddress,
            poll_interval: 30,
          },
        },
      ];
    });
  }

  async _fetchDiagnostics(ip) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`http://${ip}/diagnostics`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

}

module.exports = FreshRDriver;

'use strict';

const Homey = require('homey');

// Mapping of diagnostics array indices to capabilities
// Source: /diagnostics endpoint reverse-engineered from Fresh-R Compac web interface
const IDX = {
  MODE:             0,   // 8 = auto
  T1:               1,   // Extract air from room ÷10 °C
  T2:               2,   // Exhaust air leaving unit ÷10 °C
  T3:               3,   // Outdoor air entering unit ÷10 °C
  T4:               4,   // Supply air into room ÷10 °C
  T_BAL:            5,   // Balance temperature (direct) °C
  CO2:              6,   // CO2 ppm (direct)
  T_SUPPLY:         7,   // Room temperature ÷10 °C
  HUM_SUPPLY:       8,   // Supply air humidity ÷100 %
  DEWPOINT:         9,   // Dew point ÷10 °C
  FAN1_PWM:        10,   // Fan 1 PWM ÷10 %
  FAN2_PWM:        11,   // Fan 2 PWM ÷10 %
  FAN1_RPM:        12,   // Fan 1 RPM (direct)
  FAN2_RPM:        13,   // Fan 2 RPM (direct)
  FLOW:            14,   // Airflow raw value — calibrated to m³/h
  HTR_TEMP_IN:     15,   // Heater temp in (direct) °C
  HTR_TEMP_OUT:    16,   // Heater temp out (direct) °C
  HTR_POWER:       17,   // Heater power W (direct)
};

class FreshRDevice extends Homey.Device {

  async onInit() {
    this.log(`Fresh-R Compac device initialized: ${this.getName()}`);
    this._pollInterval = null;
    this._startPolling();
  }

  async onDeleted() {
    this._stopPolling();
  }

  async onSettings({ changedKeys }) {
    if (changedKeys.includes('poll_interval') || changedKeys.includes('ip_address')) {
      this._stopPolling();
      this._startPolling();
    }
  }

  _startPolling() {
    const intervalSeconds = this.getSetting('poll_interval') || 30;
    this.log(`Starting polling every ${intervalSeconds}s`);

    // Poll immediately on start
    this._poll();

    this._pollInterval = this.homey.setInterval(() => {
      this._poll();
    }, intervalSeconds * 1000);
  }

  _stopPolling() {
    if (this._pollInterval) {
      this.homey.clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  _poll() {
    const ip = this.getSetting('ip_address');
    if (!ip) {
      this.log('No IP address configured');
      return;
    }

    this._fetchDiagnostics(ip)
      .then((values) => {
        this.setAvailable();
        this._updateCapabilities(values);
      })
      .catch((err) => {
        this.log(`Poll error: ${err.message}`);
        this.setUnavailable(`Connection failed: ${err.message}`);
      });
  }

  _updateCapabilities(values) {
    const set = (capability, value) => {
      if (value === null || value === undefined || isNaN(value)) return;
      this.setCapabilityValue(capability, value).catch((err) => {
        this.log(`Failed to set ${capability}: ${err.message}`);
      });
    };

    const int = (idx) => parseInt(values[idx], 10);

    // Mode
    set('ventilation_mode', String(int(IDX.MODE)));

    // Temperatures (÷10)
    set('measure_temperature_t1',      int(IDX.T1)       / 10);
    set('measure_temperature_t2',      int(IDX.T2)       / 10);
    set('measure_temperature_t3',      int(IDX.T3)       / 10);
    set('measure_temperature_t4',      int(IDX.T4)       / 10);
    set('measure_temperature_supply',  int(IDX.T_SUPPLY) / 10);
    set('measure_dewpoint',            int(IDX.DEWPOINT) / 10);

    // CO2 (ppm, direct)
    set('measure_co2', int(IDX.CO2));

    // Humidity (÷100)
    set('measure_humidity', int(IDX.HUM_SUPPLY) / 100);

    // Fan speeds
    set('measure_fan1_pwm', int(IDX.FAN1_PWM) / 10);
    set('measure_fan2_pwm', int(IDX.FAN2_PWM) / 10);
    set('measure_fan1_rpm', int(IDX.FAN1_RPM));
    set('measure_fan2_rpm', int(IDX.FAN2_RPM));

    // Airflow (calibrated from raw value)
    const FLOW_CALIBRATION_THRESHOLD = 200;
    const FLOW_CALIBRATION_OFFSET    = 700;
    const FLOW_CALIBRATION_DIVISOR   = 30;
    const FLOW_CALIBRATION_BASE      = 20;
    const rawFlow = int(IDX.FLOW);
    if (rawFlow > FLOW_CALIBRATION_THRESHOLD) {
      const calibratedFlow = (rawFlow - FLOW_CALIBRATION_OFFSET) / FLOW_CALIBRATION_DIVISOR + FLOW_CALIBRATION_BASE;
      set('measure_flow', Math.round(calibratedFlow * 10) / 10);
    }

    // Heater
    set('measure_heater_temp_in',  int(IDX.HTR_TEMP_IN));
    set('measure_heater_temp_out', int(IDX.HTR_TEMP_OUT));
    set('measure_heater_power',    int(IDX.HTR_POWER));
  }

  async _fetchDiagnostics(ip) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`http://${ip}/diagnostics`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const values = await response.json();
      if (!Array.isArray(values) || values.length < 15) {
        throw new Error('Unexpected response format');
      }
      return values;
    } finally {
      clearTimeout(timeout);
    }
  }

}

module.exports = FreshRDevice;

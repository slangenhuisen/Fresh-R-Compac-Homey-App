# Fresh-R Compac — Homey App

Monitor your [Fresh-R Compac](https://www.fresh-r.com) ventilation unit from Homey. The app polls the device's local HTTP API and exposes all sensor values as Homey capabilities for use in flows and insights.

---

## Capabilities

| Capability | Description | Unit |
|---|---|---|
| Ventilation Mode | Current operating mode (Auto, Level 1–3, Off) | — |
| CO₂ | Carbon dioxide level | ppm |
| Humidity | Supply air relative humidity | % |
| Temperature T1 | Indoor temperature | °C |
| Temperature T2 | Exhaust air temperature | °C |
| Temperature T3 | Temperature sensor 3 | °C |
| Temperature T4 | Outdoor temperature | °C |
| Supply Air Temperature | Temperature of supply air | °C |
| Dew Point | Dew point of supply air | °C |
| Fan 1 Speed (PWM) | Fan 1 duty cycle | % |
| Fan 2 Speed (PWM) | Fan 2 duty cycle | % |
| Fan 1 Speed (RPM) | Fan 1 rotational speed | rpm |
| Fan 2 Speed (RPM) | Fan 2 rotational speed | rpm |
| Airflow | Calibrated airflow | m³/h |
| Heater Temperature In | Inlet temperature of the heater | °C |
| Heater Temperature Out | Outlet temperature of the heater | °C |
| Heater Power | Heater power consumption | W |

---

## Requirements

### To build and develop the app

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v8 or higher (included with Node.js)
- **Homey CLI** — install globally:
  ```bash
  npm install -g homey
  ```
- A **Homey developer account** — register at [homey.app](https://homey.app) and enable developer mode on your Homey

### To run the app on Homey

- **Homey Pro** (2019 or 2023 model) running firmware **≥ 5.0.0**
- Your Fresh-R Compac unit must be **connected to your local network** (Wi-Fi)
- The Fresh-R Compac must be **reachable by IP address** from the Homey (same network or routed)
- The device's `/diagnostics` HTTP endpoint must be accessible (no authentication required by default)

---

## Project structure

```
homey-freshr/
├── app.js                                      # App entry point
├── app.json                                    # App manifest (capabilities, driver, settings)
├── package.json
├── assets/
│   └── images/
│       ├── large.png                           # App icon 500×500
│       └── small.png                           # App icon 135×135
└── drivers/
    └── freshr-compac/
        ├── driver.js                           # Pairing logic
        ├── device.js                           # Polling + capability updates
        ├── driver.settings.compose.json        # Settings definition (reference)
        └── assets/
            └── images/
                ├── large.png                   # Driver icon 500×500
                └── small.png                   # Driver icon 135×135
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Log in to your Homey account

```bash
homey login
```

### 3. Validate the app

```bash
homey app validate
```

### 4. Run on your Homey (development mode)

```bash
homey app run
```

This installs the app on your Homey temporarily. Logs stream to your terminal. The app is removed when you stop the process.

### 5. Install permanently

```bash
homey app install
```

---

## Adding the device

1. Open the **Homey app** on your phone or tablet
2. Go to **Devices** → **+** → search for **Fresh-R Compac**
3. Enter the **IP address** of your Fresh-R unit (e.g. `192.168.1.130`)
4. Homey will connect to the device and add it

---

## Device settings

After pairing, open the device settings in the Homey app to adjust:

| Setting | Default | Description |
|---|---|---|
| IP Address | `192.168.1.130` | Local IP of the Fresh-R unit |
| Poll Interval | `30` seconds | How often Homey fetches data (10–300 s) |

Changing either setting takes effect immediately without restarting the app.

---

## How it works

The Fresh-R Compac exposes a local HTTP endpoint at `http://<ip>/diagnostics` that returns a JSON array of 32 integer values (as strings). The app polls this endpoint on a configurable interval and maps each array index to a Homey capability:

| Index | Raw value example | Capability | Conversion |
|---|---|---|---|
| 0 | `8` | Ventilation Mode | `8` = Auto |
| 1 | `208` | Temperature T1 | ÷ 10 → 20.8 °C |
| 2 | `207` | Temperature T2 | ÷ 10 → 20.7 °C |
| 3 | `208` | Temperature T3 | ÷ 10 → 20.8 °C |
| 4 | `205` | Temperature T4 | ÷ 10 → 20.5 °C |
| 5 | `2` | Balance Temp | direct → 2 °C |
| 6 | `856` | CO₂ | direct → 856 ppm |
| 7 | `212` | Supply Air Temp | ÷ 10 → 21.2 °C |
| 8 | `5006` | Humidity | ÷ 100 → 50.06 % |
| 9 | `97` | Dew Point | ÷ 10 → 9.7 °C |
| 10 | `115` | Fan 1 PWM | ÷ 10 → 11.5 % |
| 11 | `27` | Fan 2 PWM | ÷ 10 → 2.7 % |
| 12 | `1259` | Fan 1 RPM | direct → 1259 rpm |
| 13 | `776` | Fan 2 RPM | direct → 776 rpm |
| 14 | `1025` | Airflow | calibrated → 30.8 m³/h |
| 15 | `0` | Heater Temp In | direct → 0 °C |
| 16 | `0` | Heater Temp Out | direct → 0 °C |
| 17 | `0` | Heater Power | direct → 0 W |

---

## Releasing a new version

### 1. Bump the version number

Edit `app.json` and increment `"version"` following [semver](https://semver.org):

| Change type | Example | When to use |
|---|---|---|
| Patch `x.x.1` | `1.0.0` → `1.0.1` | Bug fix, no new capabilities |
| Minor `x.1.x` | `1.0.1` → `1.1.0` | New capability or feature, backwards compatible |
| Major `1.x.x` | `1.1.0` → `2.0.0` | Breaking change (e.g. removed capability) |

### 2. Validate

```bash
homey app validate
```

### 3. Install over the existing version

```bash
homey app install
```

Homey will overwrite the installed app in-place. Your paired devices, flows, and settings are preserved as long as:
- The `"id"` in `app.json` has not changed (`com.freshr.compac`)
- No capabilities were removed (removing a capability that a flow uses will break that flow)
- The driver `"id"` has not changed (`freshr-compac`)

> **If you added a new capability**, existing paired devices will **not** automatically get it. You need to re-pair the device, or add the capability programmatically in `device.js` using `this.addCapability('capability_name')` inside `onInit`.

### 4. Commit and push to GitHub

```bash
git add app.json           # always include the version bump
git add -p                 # review and stage other changed files
git commit -m "v1.1.0: <short description of changes>"
git push
```

### 5. Tag the release (optional but recommended)

```bash
git tag v1.1.0
git push origin v1.1.0
```

Then create a GitHub release from the tag at [github.com/slangenhuisen/Fresh-R-Compac-Homey-App/releases](https://github.com/slangenhuisen/Fresh-R-Compac-Homey-App/releases).

---

## Troubleshooting

**Device not found during pairing**
- Check the IP address is correct: open `http://<ip>/diagnostics` in a browser — you should see a JSON array
- Make sure Homey and the Fresh-R are on the same network
- Check that no firewall is blocking port 80

**Device shows as unavailable**
- The Fresh-R may have gotten a new IP address from DHCP — assign a static IP in your router for the device's MAC address, then update the IP in device settings
- Try reducing the poll interval temporarily to confirm connectivity is the issue

**Values not updating**
- Increase the poll interval if the Homey CPU is under load
- Check the Homey developer tools for app logs: `homey app logs`

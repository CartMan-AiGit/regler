# 🔥 Regler — Контроллер Regler PRO wi-fi

**ESP-01S (ESP8266) replacement firmware for solid-fuel boiler control boards based on ESP8285 + TM1637.**

Reverse-engineered UART protocol of a Chinese solid-fuel boiler controller. Replaces the original cloud-dependent WiFi module with a fully local ESPHome-based solution.

![ESPHome](https://img.shields.io/badge/ESPHome-ready-blue)
![ESP8266](https://img.shields.io/badge/ESP-01S%201MB-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Flash](https://img.shields.io/badge/flash-49%25-yellow)

## 📋 Features

- **Full local control** — no cloud, no Chinese servers, no Tuya
- **Home Assistant integration** via native ESPHome API
- **Web interface** with real-time SSE updates (no CDN dependency)
- **WiFi configuration** via built-in web portal (AP mode)
- **Physical button** support (Button 4 long press → AP mode)
- **9 EEPROM parameters** — read/write boiler settings remotely
- **Buzzer mute** — automatic suppression without triggering ECO mode
- **LED status sync** — LED5 reflects WiFi state, LED6 = ESP alive
- **Auto-AP fallback** — 60s without WiFi → AP activates automatically
- **OTA updates** — fits in 49% of 1MB flash, safe OTA possible

## 🔧 Hardware

| Component | Details |
|-----------|---------|
| **Boiler board** | Chinese solid-fuel controller with ESP8285 MCU |
| **Display** | TM1637 — 4 digits + 6 LEDs + 4 buttons |
| **WiFi module** | ESP-01S (ESP8266, 1MB flash) — pluggable replacement |
| **Fan** | TRIAC-controlled via zero-crossing (GPIO12/15) |
| **Pump** | Relay on GPIO4 (firmware-controlled thermostatic) |
| **Emergency pump** | GPIO5 — activates on overheat (≥120°C) |
| **UART** | 9600 8N1 between ESP-01S ↔ ESP8285 |

### Board Photo & Pinout

```
ESP-01S connector on boiler board:
  GPIO1 (TX) → ESP8285 RX (UART data)
  GPIO3 (RX) → ESP8285 TX (UART data)
  3.3V, GND  → power
```

## 📡 UART Protocol

Frame format: `SOH(0x01) + TYPE + STX(0x02) + DATA + ETX(0x03)`

| Type | Direction | Purpose |
|------|-----------|---------|
| TYPE1 (`'1'`) | Both | Commands & responses |
| TYPE2 (`'2'`) | ESP→Board | Heartbeat (1s watchdog) |

### Command format (TYPE1)
```
SOH + '1' + STX + '0' + value[2] + key[2] + ETX
Example: 01 31 02 30 33 39 45 46 03 = EF=39 (pump threshold 39°C)
```

### Response format (TYPE1)
```
Runtime:  a<setpoint>bcd<temp>e<mode>f<ver>g<overheat>hij<warn>k<eco>l
EEPROM:   A<p8>B<p3>C<p10>D<p5>E<p0>F<p9>G<fire>HIJK<p1>L<p4>M
```

### Heartbeat (TYPE2)
```
SOH + '2' + STX + wifi_status + counter + ETX + CR + LF
wifi_status: '0'=off, '1'=connected(500ms blink), '3'=AP(100ms blink)
counter: '0'-'8' cycling — MUST increment or board kills LED5!
```

## ⚙️ EEPROM Parameters

| Param | Key | Command | Default | Description |
|-------|-----|---------|---------|-------------|
| Setpoint | a | ab=XX | 50°C | Target water temperature |
| Fan max | D | DE=XX | 100% | TRIAC fan max power |
| Fan min | C | CD=XX | 60% | Fan min modulation |
| Purge duration | A | AB=XX | 20s | Purge blow duration |
| Purge interval | B | BC=XX | 10min | Time between purges |
| Ignition timeout | L | KL=XX | 30min | Ignition failure timeout |
| Fire threshold | F | FG=XX | 30°C | Fire detection temp |
| NTC calibration | K | JK=XX | 20 | NTC offset (K-20) |
| Pump threshold | E | EF=XX | 65°C | Pump on temperature |

## 🔥 Boiler Algorithm

```
IGNITION:
  Fan → D% (max)
  Timer: L minutes
    T > setpoint(a) → fan modulates to C%
    T ≥ E → pump ON
    Timeout → fire failed → fan OFF

RUNNING:
  Fan modulation: C%..D% based on (setpoint - T)
  Purge: every B min → fan MAX for A sec
  Pump: ON when T≥E, OFF when T<E-2 (2°C hysteresis)

SAFETY:
  T ≥ 90°C  → warning (j=1), display blinks
  T ≥ 120°C → overheat (g=1), GPIO5 emergency pump pulses
  Thresholds hardcoded — cannot be changed!
```

## 🌐 WiFi Configuration

1. **First boot**: connects to SSID from `secrets.yaml`
2. **Button 4 (5s hold)**: toggles AP mode → LED5 fast blink
3. **Auto-AP**: 60s without WiFi → AP starts automatically
4. **Web portal**: connect to `Boiler-AP` → open http://192.168.4.1 → enter SSID/password → Save & Reboot
5. **Reset**: press "Reset default" in web portal → returns to `secrets.yaml` credentials

WiFi credentials stored in dedicated flash sector (0xF9), survives OTA updates.

## 📊 LED Indicators

| LED | Meaning |
|-----|---------|
| LED2 | Pump active (firmware-controlled) |
| LED3 | Fan active (firmware-controlled) |
| LED4 | Ignition in progress (blinks) |
| LED5 | WiFi: 500ms blink = normal, 100ms = AP mode |
| LED6 | ESP-01S alive (goes dark after 120s if module dies) |

## 🚀 Installation

### Prerequisites
- [ESPHome](https://esphome.io/) installed
- ESP-01S module (1MB flash)
- USB-UART adapter for initial flash

### Steps

1. Clone the repository:
```bash
git clone https://github.com/CartMan-AiGit/regler.git
cd regler
```

2. Copy and edit secrets:
```bash
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your WiFi credentials and API keys
```

3. Generate API encryption key:
```bash
python3 -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

4. Compile and flash:
```bash
esphome compile boiler_v2.yaml
esphome upload boiler_v2.yaml  # USB for first flash, then OTA
```

### Flash Budget
```
RAM:   41.4% (33908 / 81920 bytes)
Flash: 49.2% (503909 / 1023984 bytes) — safe OTA margin ✅
```

## 📁 Project Structure

```
regler/
├── boiler_v2.yaml          # Main ESPHome config (all logic)
├── wifi_setup.h            # ESP8266 SDK headers + flash struct
├── webserver.js            # Web UI (SSE + WiFi config portal)
├── webserver.css           # Web UI styles
├── secrets.yaml.example    # Template for credentials
└── README.md
```

## 🏠 Home Assistant

The device auto-discovers in Home Assistant via ESPHome integration:

**Sensors:**
- Water temperature (°C)
- Target temperature (°C)
- Operating mode

**Binary sensors:**
- Pump status
- Fire detected
- Warning (90°C+)
- Overheat (120°C+)

**Controls:**
- Heating ON/OFF switch
- 9 number sliders for all EEPROM parameters

**Status:**
- Combined text sensor with mode, pump, warnings, ECO

## 📜 Reverse Engineering

This project was created by reverse-engineering the ESP8285 firmware using Ghidra. The original firmware communicates with a Chinese cloud service. This replacement provides fully local control.

Key discoveries:
- TM1637 manages display, LEDs, AND button input via key scan
- Buzzer mute requires `hi=0` every second (but `hi=1` triggers ECO mode!)
- Heartbeat counter must increment or board considers module dead
- LED6 lights up when TYPE1 data contains both `'h'` and `'i'` markers
- Button 4 long press sends `e=3` once (not sustained)

## 📄 License

MIT License — use freely, modify, share.

## ⚠️ Disclaimer

This project involves controlling a solid-fuel boiler. Improper configuration can be dangerous. The safety systems (90°C warning, 120°C emergency pump) are hardcoded in the original ESP8285 firmware and cannot be disabled. Always ensure proper physical safety measures are in place.

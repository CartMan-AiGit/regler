// ESP8266 SDK + custom flash sector for WiFi creds
#pragma once
extern "C" {
#include "user_interface.h"
}

struct BoilerWifiCreds {
  uint32_t magic;
  char ssid[36];   // max 32 + null + pad
  char pass[64];   // max 63 + null
};  // 104 bytes, 4-byte aligned

#define BWIFI_MAGIC  0xCAFE0001
#define BWIFI_SECTOR 0xF9
#define BWIFI_ADDR   (BWIFI_SECTOR * SPI_FLASH_SEC_SIZE)

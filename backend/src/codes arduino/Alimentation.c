#include <Servo.h>
#include <ArduinoJson.h>
#include <RTClib.h>
#include <Wire.h>
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define LDR_PIN A1
const int FOOD_SERVO_PIN = 9;
const int WATER_PUMP_PIN = 10;
const int WATER_PUMP_2_PIN = 12;
const int LED_PIN = 13;
const int LAMP_PIN = 11;
const int WATER_LEVEL_SENSOR_PIN = A0;

RTC_DS3231 rtc;
Servo foodServo;
bool feedingActive = false;
bool waterActive = false;
bool water2Active = false;
bool lampActive = false;
bool lampManualOverride = false;
bool feedingManualOverride = false;
bool waterManualOverride = false;
bool waterProgramsEnabled = true;
bool feedProgramsEnabled = true;

struct FeedingProgram {
  uint8_t startHour;
  uint8_t startMinute;
  uint8_t endHour;
  uint8_t endMinute;
  bool enabled;
  String feedType;
};

struct LampSchedule {
  uint8_t startHour;
  uint8_t startMinute;
  uint8_t endHour;
  uint8_t endMinute;
  bool enabled;
};

FeedingProgram programs[10];
int programCount = 0;
LampSchedule lampSchedule = {0, 0, 0, 0, false};

void logSystemState(const char* context) {
  Serial.print("[LOG][");
  Serial.print(context);
  Serial.print("] Feeding: ");
  Serial.print(feedingActive ? "ON" : "OFF");
  Serial.print(", Water: ");
  Serial.print(waterActive ? "ON" : "OFF");
  Serial.print(", Water2: ");
  Serial.print(water2Active ? "ON" : "OFF");
  Serial.print(", LED: ");
  Serial.print(digitalRead(LED_PIN) == HIGH ? "ON" : "OFF");
  Serial.print(", Pump: ");
  Serial.print(digitalRead(WATER_PUMP_PIN) == LOW ? "ON" : "OFF");
  Serial.print(", Pump2: ");
  Serial.print(digitalRead(WATER_PUMP_2_PIN) == LOW ? "ON" : "OFF");
  Serial.print(", Servo: ");
  Serial.print(foodServo.read());
  Serial.print(", Lamp: ");
  Serial.print(digitalRead(LAMP_PIN) == HIGH ? "ON" : "OFF");
  Serial.print(", Water Level: ");
  Serial.print(getWaterLevelPercentage());
  Serial.print("%, Temp: ");
  Serial.print(getTemperature());
  Serial.print("C, Humidity: ");
  Serial.print(getHumidity());
  Serial.print("%, Light: ");
  Serial.print(getLightLevel());
  Serial.println("%");
}

bool isTimeInRange(DateTime now, uint8_t startHour, uint8_t startMinute, uint8_t endHour, uint8_t endMinute) {
  int currentMinutes = now.hour() * 60 + now.minute();
  int startMinutes = startHour * 60 + startMinute;
  int endMinutes = endHour * 60 + endMinute;
  if (endMinutes < startMinutes) {
    return (currentMinutes >= startMinutes || currentMinutes < endMinutes);
  }
  return (currentMinutes >= startMinutes && currentMinutes < endMinutes);
}

float getWaterLevelPercentage() {
  int sensorValue = analogRead(WATER_LEVEL_SENSOR_PIN);
  const int MIN_VALUE = 100; // Valeur minimale attendue (capteur vide)
  const int MAX_VALUE = 900; // Valeur maximale attendue (capteur plein)

  // Détection si le capteur est déconnecté ou hors plage
  if (sensorValue < 50 || sensorValue > 1023) { // Plage anormale pour un capteur déconnecté
    Serial.println("[WATER LEVEL] Sensor disconnected or invalid, returning 0%");
    return 0.0; // Retourner 0 si le capteur semble déconnecté
  }

  // Normalisation entre MIN_VALUE et MAX_VALUE
  if (sensorValue < MIN_VALUE) sensorValue = MIN_VALUE;
  if (sensorValue > MAX_VALUE) sensorValue = MAX_VALUE;
  
  float percentage = ((float)(MAX_VALUE - sensorValue) / (MAX_VALUE - MIN_VALUE)) * 100;
  if (percentage < 0) percentage = 0; // Assurer que le pourcentage reste positif
  if (percentage > 100) percentage = 100; // Limiter à 100%

  return percentage;
}

float getTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("[ERROR] Failed to read temperature from DHT11");
    return -1;
  }
  return temp;
}

float getHumidity() {
  float humid = dht.readHumidity();
  if (isnan(humid)) {
    Serial.println("[ERROR] Failed to read humidity from DHT11");
    return -1;
  }
  return humid;
}

float getLightLevel() {
  int ldrValue = analogRead(LDR_PIN);
  float lightPercentage = (float)ldrValue / 1023.0 * 100.0;
  return lightPercentage;
}

void setup() {
  pinMode(WATER_PUMP_PIN, OUTPUT);
  pinMode(WATER_PUMP_2_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LAMP_PIN, OUTPUT);
  digitalWrite(WATER_PUMP_PIN, HIGH);
  digitalWrite(WATER_PUMP_2_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LAMP_PIN, LOW);

  Serial.begin(9600);
  while (!Serial) {
    delay(100);
  }
  Serial.println("[SETUP] Serial initialized");

  foodServo.attach(FOOD_SERVO_PIN);
  foodServo.write(0);
  Serial.println("[SETUP] Servo initialized at 0");

  dht.begin();
  Serial.println("[SETUP] DHT11 initialized");

  if (!rtc.begin()) {
    Serial.println("[ERROR] RTC not found");
    while (1);
  }
  Serial.println("[SETUP] RTC initialized");

  if (rtc.lostPower()) {
    Serial.println("[SETUP] RTC lost power, waiting for SET_TIME...");
  } else {
    DateTime now = rtc.now();
    Serial.print("[SETUP] Current RTC time: ");
    Serial.print(now.year()); Serial.print("-");
    Serial.print(now.month()); Serial.print("-");
    Serial.print(now.day()); Serial.print(" ");
    Serial.print(now.hour()); Serial.print(":");
    Serial.print(now.minute()); Serial.print(":");
    Serial.println(now.second());
  }
}

void loop() {
  static unsigned long lastLogTime = 0;
  unsigned long currentTime = millis();
  DateTime now = rtc.now();

  if (currentTime - lastLogTime >= 5000) {
    Serial.print("[LOOP] Current time: ");
    Serial.print(now.year()); Serial.print("-");
    Serial.print(now.month()); Serial.print("-");
    Serial.print(now.day()); Serial.print(" ");
    Serial.print(now.hour()); Serial.print(":");
    Serial.print(now.minute()); Serial.print(":");
    Serial.println(now.second());
    Serial.print("[DEBUG] Program count: ");
    Serial.println(programCount);
    lastLogTime = currentTime;
  }

  // Vérification du niveau d'eau pour la deuxième pompe
  float waterLevel = getWaterLevelPercentage();
  if (waterLevel < 10.0 && !water2Active) {
    Serial.println("[WATER2] Water level < 10%, activating second pump");
    water2Active = true;
    digitalWrite(WATER_PUMP_2_PIN, LOW);
    logSystemState("START-WATER2-AUTO");
    sendStatusJson();
  } else if (waterLevel >= 10.0 && water2Active) {
    Serial.println("[WATER2] Water level >= 10%, deactivating second pump");
    water2Active = false;
    digitalWrite(WATER_PUMP_2_PIN, HIGH);
    logSystemState("STOP-WATER2-AUTO");
    sendStatusJson();
  }

  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    Serial.print("[COMMAND] Received: ");
    Serial.println(command);

    if (command == "START_FEEDING") {
      startFeedingManually();
    } else if (command == "STOP_FEEDING") {
      stopFeedingManually();
    } else if (command == "START_WATER") {
      startWaterManually();
    } else if (command == "STOP_WATER") {
      stopWaterManually();
    } else if (command == "START_LAMP") {
      startLampManually();
    } else if (command == "STOP_LAMP") {
      stopLampManually();
    } else if (command == "STOP_WATER_IMMEDIATE") {
      stopWaterImmediate();
    } else if (command == "STOP_FEEDING_IMMEDIATE") {
      stopFeedingImmediate();
    } else if (command == "GET_STATUS") {
      sendStatusJson();
    } else if (command.startsWith("SET_PROGRAMS:")) {
      parsePrograms(command);
    } else if (command.startsWith("SET_LAMP_SCHEDULE:")) {
      parseLampSchedule(command);
    } else if (command.startsWith("SET_TIME:")) {
      setTimeFromCommand(command);
    } else if (command == "DEBUG_ON") {
      Serial.println("[DEBUG] Detailed logging enabled");
    } else {
      Serial.println("[COMMAND] Unknown command");
    }
  }

  checkPrograms(now);
  checkLampSchedule(now);
  delay(50);
}

void checkPrograms(DateTime now) {
  bool anyFeedingActive = false;
  bool anyWaterActive = false;

  for (int i = 0; i < programCount; i++) {
    if (!programs[i].enabled || 
        (!waterProgramsEnabled && programs[i].feedType == "Eau") ||
        (!feedProgramsEnabled && programs[i].feedType != "Eau")) {
      continue;
    }
    bool shouldBeActive = isTimeInRange(now, programs[i].startHour, programs[i].startMinute,
                                        programs[i].endHour, programs[i].endMinute);
    if (programs[i].feedType == "Eau") {
      if (shouldBeActive) anyWaterActive = true;
    } else {
      if (shouldBeActive) anyFeedingActive = true;
    }
  }

  if (anyFeedingActive && !feedingActive) {
    Serial.println("[AUTO-FEEDING] Starting feeding program");
    feedingManualOverride = false;
    startFeeding();
  } else if (!anyFeedingActive && feedingActive && !feedingManualOverride) {
    Serial.println("[AUTO-FEEDING] Stopping feeding program");
    stopFeeding();
  }

  if (anyWaterActive && !waterActive) {
    Serial.println("[AUTO-WATER] Starting water program");
    waterManualOverride = false;
    startWater();
  } else if (!anyWaterActive && waterActive && !waterManualOverride) {
    Serial.println("[AUTO-WATER] Stopping water program");
    stopWater();
  }
}

void checkLampSchedule(DateTime now) {
  if (!lampSchedule.enabled) return;
  bool shouldBeActive = isTimeInRange(now, lampSchedule.startHour, lampSchedule.startMinute,
                                      lampSchedule.endHour, lampSchedule.endMinute);
  if (lampManualOverride && lampActive) return;
  if (shouldBeActive && !lampActive) {
    Serial.println("[AUTO-LAMP] Starting lamp");
    lampActive = true;
    digitalWrite(LAMP_PIN, HIGH);
    logSystemState("START-LAMP-AUTO");
    sendStatusJson();
  } else if (!shouldBeActive && lampActive && !lampManualOverride) {
    Serial.println("[AUTO-LAMP] Stopping lamp");
    lampActive = false;
    digitalWrite(LAMP_PIN, LOW);
    logSystemState("STOP-LAMP-AUTO");
    sendStatusJson();
  }
}

void startFeeding() {
  feedingActive = true;
  digitalWrite(LED_PIN, HIGH);
  foodServo.write(90);
  logSystemState("START-FEEDING-AUTO");
  sendStatusJson();
}

void stopFeeding() {
  feedingActive = false;
  foodServo.write(0);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-FEEDING-AUTO");
  sendStatusJson();
}

void startWater() {
  waterActive = true;
  digitalWrite(WATER_PUMP_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);
  logSystemState("START-WATER-AUTO");
  sendStatusJson();
}

void stopWater() {
  waterActive = false;
  digitalWrite(WATER_PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-WATER-AUTO");
  sendStatusJson();
}

void startFeedingManually() {
  feedingActive = true;
  feedingManualOverride = true;
  digitalWrite(LED_PIN, HIGH);
  foodServo.write(90);
  logSystemState("START-FEEDING-MANUAL");
  sendStatusJson();
}

void stopFeedingManually() {
  feedingActive = false;
  feedingManualOverride = false;
  foodServo.write(0);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-FEEDING-MANUAL");
  sendStatusJson();
}

void startWaterManually() {
  waterActive = true;
  waterManualOverride = true;
  digitalWrite(WATER_PUMP_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);
  logSystemState("START-WATER-MANUAL");
  sendStatusJson();
}

void stopWaterManually() {
  waterActive = false;
  waterManualOverride = false;
  digitalWrite(WATER_PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-WATER-MANUAL");
  sendStatusJson();
}

void startLampManually() {
  lampActive = true;
  lampManualOverride = true;
  digitalWrite(LAMP_PIN, HIGH);
  logSystemState("START-LAMP-MANUAL");
  sendStatusJson();
}

void stopLampManually() {
  lampActive = false;
  lampManualOverride = false;
  digitalWrite(LAMP_PIN, LOW);
  logSystemState("STOP-LAMP-MANUAL");
  sendStatusJson();
}

void stopWaterImmediate() {
  waterActive = false;
  waterManualOverride = false;
  waterProgramsEnabled = false;
  digitalWrite(WATER_PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-WATER-IMMEDIATE");
  sendStatusJson();
}

void stopFeedingImmediate() {
  feedingActive = false;
  feedingManualOverride = false;
  feedProgramsEnabled = false;
  foodServo.write(0);
  digitalWrite(LED_PIN, LOW);
  logSystemState("STOP-FEEDING-IMMEDIATE");
  sendStatusJson();
}

void parsePrograms(String command) {
  int colonIndex = command.indexOf(':');
  if (colonIndex > 0) {
    String jsonData = command.substring(colonIndex + 1);
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, jsonData);
    if (error) {
      Serial.print("[ERROR] JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }
    programCount = 0;
    JsonArray programsArray = doc.as<JsonArray>();
    for (JsonObject prog : programsArray) {
      if (programCount >= 10) break;
      String startTime = prog["programStartTime"].as<String>();
      String endTime = prog["programEndTime"].as<String>();
      String feedType = prog["feedType"].as<String>();
      bool enabled = prog["enabled"] | true;
      programs[programCount].startHour = startTime.substring(0, 2).toInt();
      programs[programCount].startMinute = startTime.substring(3, 5).toInt();
      programs[programCount].endHour = endTime.substring(0, 2).toInt();
      programs[programCount].endMinute = endTime.substring(3, 5).toInt();
      programs[programCount].enabled = enabled;
      programs[programCount].feedType = feedType;
      if (feedType == "Eau") waterProgramsEnabled = true;
      else feedProgramsEnabled = true;
      programCount++;
    }
    feedingActive = false;
    waterActive = false;
    feedingManualOverride = false;
    waterManualOverride = false;
  }
}

void parseLampSchedule(String command) {
  int colonIndex = command.indexOf(':');
  if (colonIndex > 0) {
    String jsonData = command.substring(colonIndex + 1);
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, jsonData);
    if (error) {
      Serial.print("[ERROR] Lamp JSON parsing failed: ");
      Serial.println(error.c_str());
      return;
    }
    String startTime = doc["startTime"].as<String>();
    String endTime = doc["endTime"].as<String>();
    bool enabled = doc["enabled"] | true;
    lampSchedule.startHour = startTime.substring(0, 2).toInt();
    lampSchedule.startMinute = startTime.substring(3, 5).toInt();
    lampSchedule.endHour = endTime.substring(0, 2).toInt();
    lampSchedule.endMinute = endTime.substring(3, 5).toInt();
    lampSchedule.enabled = enabled;
  }
}

void setTimeFromCommand(String command) {
  if (command.startsWith("SET_TIME:")) {
    String timeStr = command.substring(9);
    int year = timeStr.substring(0, 4).toInt();
    int month = timeStr.substring(5, 7).toInt();
    int day = timeStr.substring(8, 10).toInt();
    int hour = timeStr.substring(11, 13).toInt();
    int minute = timeStr.substring(14, 16).toInt();
    int second = timeStr.substring(17, 19).toInt();
    if (year >= 2020 && year <= 2099 &&
        month >= 1 && month <= 12 &&
        day >= 1 && day <= 31 &&
        hour >= 0 && hour <= 23 &&
        minute >= 0 && minute <= 59 &&
        second >= 0 && second <= 59) {
      rtc.adjust(DateTime(year, month, day, hour, minute, second));
      Serial.println("[SET_TIME] RTC updated successfully");
    }
  }
}

void sendStatusJson() {
  StaticJsonDocument<300> doc;
  doc["feedingActive"] = feedingActive;
  doc["waterActive"] = waterActive;
  doc["water2Active"] = water2Active;
  doc["ledState"] = digitalRead(LED_PIN) == HIGH;
  doc["pumpState"] = digitalRead(WATER_PUMP_PIN) == LOW;
  doc["pump2State"] = digitalRead(WATER_PUMP_2_PIN) == LOW;
  doc["servoPosition"] = foodServo.read();
  doc["lampState"] = digitalRead(LAMP_PIN) == HIGH;
  doc["waterLevel"] = getWaterLevelPercentage();
  doc["temperature"] = getTemperature();
  doc["humidity"] = getHumidity();
  doc["lightLevel"] = getLightLevel();
  serializeJson(doc, Serial);
  Serial.println();
}
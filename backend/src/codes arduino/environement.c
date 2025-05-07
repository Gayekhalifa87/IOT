#include "DHT.h"

#define DHTPIN 2          // Broche de données du capteur DHT11
#define DHTTYPE DHT11     // Type de capteur DHT
#define LDR_PIN A0        // Broche de la photorésistance (LDR)

// Constantes pour le timeout et les tentatives
#define MAX_SENSOR_READ_ATTEMPTS 5  // Nombre maximal de tentatives de lecture
#define SENSOR_READ_DELAY 2000      // Délai entre les tentatives (en ms)

DHT dht(DHTPIN, DHTTYPE);  // Initialisation du capteur DHT

void setup() {
  Serial.begin(9600);      // Initialisation de la communication série
  delay(1000);             // Attendre que la connexion série soit établie

  dht.begin();             // Initialisation du capteur DHT
  delay(2000);             // Délai supplémentaire pour stabiliser les capteurs

  // Envoyer un message d'initialisation valide
  Serial.println("{\"status\":\"ready\"}");
}

void loop() {
  // Variables pour stocker les données des capteurs
  float temperature = 0;
  float humidity = 0;
  int lightValue = 0;
  float lightPercentage = 0;
  bool sensorsOk = false;

  // Plusieurs tentatives de lecture des capteurs
  for (int attempt = 0; attempt < MAX_SENSOR_READ_ATTEMPTS; attempt++) {
    temperature = dht.readTemperature();  // Lire la température
    humidity = dht.readHumidity();        // Lire l'humidité
    lightValue = analogRead(LDR_PIN);     // Lire la valeur brute de la LDR
    lightPercentage = (lightValue / 1023.0) * 100.0;  // Convertir en pourcentage

    // Vérifier que toutes les valeurs sont valides
    if (!isnan(temperature) && !isnan(humidity) &&
        temperature > -40 && temperature < 80 &&
        humidity >= 0 && humidity <= 100) {
      sensorsOk = true;
      break;  // Sortir de la boucle si les valeurs sont valides
    }

    // Attendre avant de réessayer
    delay(SENSOR_READ_DELAY);
  }

  // Préparer et envoyer le message JSON
  if (sensorsOk) {
    // Vérification supplémentaire des valeurs
    if (temperature < -40 || temperature > 80 || humidity < 0 || humidity > 100) {
      // Si les valeurs sont hors limites après la vérification précédente
      Serial.println("{\"error\":\"invalid_readings\",\"status\":\"check_sensors\"}");
    } else {
      // Convertir les nombres flottants en chaînes de caractères
      char tempStr[6];
      char humStr[6];
      char lightPctStr[6];
      dtostrf(temperature, 4, 1, tempStr);
      dtostrf(humidity, 4, 1, humStr);
      dtostrf(lightPercentage, 4, 1, lightPctStr);

      // Créer un message JSON avec les données des capteurs
      char jsonBuffer[150];
      snprintf(jsonBuffer, sizeof(jsonBuffer),
               "{\"temperature\":%s,\"humidity\":%s,\"lightRaw\":%d,\"lightPercentage\":%s}",
               tempStr, humStr, lightValue, lightPctStr);

      // Envoyer le message complet
      Serial.println(jsonBuffer);
    }
    Serial.flush();  // Attendre que tous les caractères aient été transmis
  } else {
    // Message d'erreur en cas d'échec de lecture des capteurs
    Serial.println("{\"error\":\"sensor_failure\",\"status\":\"check_wiring\"}");
    Serial.flush();
  }

  // Attente avant la prochaine lecture
  delay(8000);  // Attendre 8 secondes (plus les délais précédents = ~10 secondes)
}

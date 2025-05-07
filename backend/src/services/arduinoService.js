const { SerialPort } = require('serialport');
const EventEmitter = require('events');

const ARDUINO_PORT = 'COM5'; // Ajustez selon votre port
const BAUD_RATE = 9600;

async function listPorts() {
  const ports = await SerialPort.list();
  console.log('[ArduinoService] Available ports:', ports);
}
listPorts();

class ArduinoService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.isMockMode = false;
    this.statusBuffer = '';
    this.latestData = null;

    try {
      console.log('[ArduinoService] Attempting to initialize serial port on', ARDUINO_PORT);
      this.port = new SerialPort({ path: ARDUINO_PORT, baudRate: BAUD_RATE }, (err) => {
        if (err) {
          console.error('[ArduinoService] Failed to open serial port:', err.message);
          this.isMockMode = true;
          this.initializeMockPort();
        } else {
          console.log('[ArduinoService] Serial port successfully opened on', ARDUINO_PORT);
          setTimeout(() => {
            this.syncTime().catch(err => console.error('[ArduinoService] Initial time sync failed:', err));
          }, 2000); // Délai de 2 secondes pour laisser l’Arduino démarrer
        }
      });

      this.port.on('error', (err) => {
        console.error('[ArduinoService] Serial port error:', err.message);
        this.isMockMode = true;
        this.initializeMockPort();
        this.emit('error', err);
      });

      this.port.on('data', (data) => {
        const dataStr = data.toString();
        this.statusBuffer += dataStr;

        while (this.statusBuffer.includes('\n')) {
          const jsonLines = this.statusBuffer.split('\n');
          this.statusBuffer = jsonLines.pop() || '';

          jsonLines.forEach(line => {
            line = line.trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              try {
                const parsedData = JSON.parse(line);
                console.log('[ArduinoService] Parsed JSON from Arduino:', parsedData);

                // Mise à jour de latestData avec toutes les nouvelles données, y compris la deuxième pompe
                this.latestData = {
                  waterLevel: parsedData.waterLevel,
                  temperature: parsedData.temperature,
                  humidity: parsedData.humidity,
                  lightLevel: parsedData.lightLevel,
                  feedingActive: parsedData.feedingActive,
                  waterActive: parsedData.waterActive,
                  water2Active: parsedData.water2Active, // Ajout pour la deuxième pompe
                  ledState: parsedData.ledState,
                  pumpState: parsedData.pumpState,
                  pump2State: parsedData.pump2State, // Ajout pour la deuxième pompe
                  servoPosition: parsedData.servoPosition,
                  lampState: parsedData.lampState,
                  timestamp: new Date()
                };

                this.emit('data', this.latestData);

                // Logs spécifiques pour toutes les données, y compris la deuxième pompe
                console.log('[ArduinoService] Updated data - Water Level:', parsedData.waterLevel, '%, Temperature:', parsedData.temperature, '°C, Humidity:', parsedData.humidity, '%, Light Level:', parsedData.lightLevel, '%, Water2 Active:', parsedData.water2Active, ', Pump2 State:', parsedData.pump2State);
              } catch (error) {
                console.error('[ArduinoService] Error parsing JSON from Arduino:', error.message, 'Data:', line);
                this.emit('parse_error', { error, rawData: line });
              }
            }
          });
        }
      });
    } catch (err) {
      console.error('[ArduinoService] Error initializing serial port:', err.message);
      this.isMockMode = true;
      this.initializeMockPort();
    }
  }
  

  initializeMockPort() {
    this.port = {
      write: (data, callback) => {
        console.warn('[ArduinoService] Mock mode: Command not sent:', data.toString().trim());
        if (callback) callback(null);
      },
      drain: (callback) => {
        if (callback) callback(null);
      },
      on: () => {},
      isOpen: false
    };
    console.log('[ArduinoService] Running in mock mode');
    // Mock data avec les nouvelles valeurs, y compris la deuxième pompe
    this.latestData = {
      waterLevel: null,
      temperature: null,
      humidity: null,
      lightLevel: null,
      feedingActive: false,
      waterActive: false,
      water2Active: false,
      ledState: false,
      pumpState: false,
      pump2State: false,
      servoPosition: 0,
      lampState: false,
      timestamp: new Date(),
      isMock: true
  };
  }

  async syncTime() {
    if (this.isMockMode || !this.isConnected()) {
      console.warn('[ArduinoService] Cannot sync time: Port not connected or in mock mode');
      return Promise.resolve();
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const command = `SET_TIME:${timeStr}\n`;

    return new Promise((resolve, reject) => {
      this.port.write(command, (err) => {
        if (err) {
          console.error('[ArduinoService] Error syncing time:', err.message);
          reject(err);
        } else {
          console.log('[ArduinoService] Time sync command sent:', command.trim());
          this.port.drain((err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async sendPrograms(programs) {
    if (this.isMockMode || !this.isConnected()) {
      console.warn('[ArduinoService] Cannot send programs: Port not connected or in mock mode');
      return Promise.resolve();
    }

    await this.syncTime();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Délai de 1 seconde pour laisser l’Arduino traiter SET_TIME

    const programsToSend = Array.isArray(programs) ? programs : [programs];
    const formattedPrograms = programsToSend.map(program => ({
      programStartTime: program.programStartTime || "00:00",
      programEndTime: program.programEndTime || "00:01",
      feedType: program.feedType || "Food",
      enabled: program.enabled !== undefined ? program.enabled : true
    }));
    const jsonData = JSON.stringify(formattedPrograms);
    const command = `SET_PROGRAMS:${jsonData}\n`;

    console.log('[ArduinoService] Sending command (raw):', command);
    return new Promise((resolve, reject) => {
      this.port.write(command, (err) => {
        if (err) {
          console.error('[ArduinoService] Write error:', err.message);
          reject(err);
        } else {
          console.log('[ArduinoService] Data written:', command.trim());
          this.port.drain((err) => {
            if (err) {
              console.error('[ArduinoService] Drain error:', err.message);
              reject(err);
            } else {
              console.log('[ArduinoService] Data flushed to Arduino');
              resolve();
            }
          });
        }
      });
    });
  }

  async sendLampSchedule(schedule) {
    if (this.isMockMode || !this.isConnected()) {
      console.warn('[ArduinoService] Cannot send lamp schedule: Port not connected or in mock mode');
      return Promise.resolve();
    }

    const scheduleToSend = {
      startTime: schedule.startTime || "00:00",
      endTime: schedule.endTime || "00:01",
      enabled: schedule.enabled !== undefined ? schedule.enabled : true
    };

    const jsonData = JSON.stringify(scheduleToSend);
    const command = `SET_LAMP_SCHEDULE:${jsonData}\n`;

    return new Promise((resolve, reject) => {
      this.port.write(command, (err) => {
        if (err) {
          console.error('[ArduinoService] Error sending lamp schedule:', err.message);
          reject(err);
        } else {
          console.log('[ArduinoService] Lamp schedule sent:', command.trim());
          this.port.drain((err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }

  async sendCommand(command) {
    if (this.isMockMode || !this.isConnected()) {
      console.warn('[ArduinoService] Cannot send command: Port not connected or in mock mode');
      if (command === 'GET_STATUS') {
        const mockData = {
          waterLevel: null,
          temperature: null,
          humidity: null,
          lightLevel: null,
          feedingActive: false,
          waterActive: false,
          water2Active: false, // Ajout pour la deuxième pompe
          ledState: false,
          pumpState: false,
          pump2State: false, // Ajout pour la deuxième pompe
          servoPosition: 0,
          lampState: false,
          isMock: true
        };
        this.latestData = { ...mockData, timestamp: new Date() };
        return Promise.resolve(JSON.stringify(mockData));
      }
      return Promise.resolve();
    }

    const validCommands = [
      'START_FEEDING', 'STOP_FEEDING',
      'START_WATER', 'STOP_WATER',
      'START_LAMP', 'STOP_LAMP',
      'GET_STATUS',
      'STOP_WATER_IMMEDIATE',
      'STOP_FEEDING_IMMEDIATE',
    ];
    const isValidCommand = validCommands.includes(command) || command.startsWith('SET_TIME:');
    if (!isValidCommand) {
      return Promise.reject(new Error('Invalid command'));
    }

    const fullCommand = `${command}\n`;
    return new Promise((resolve, reject) => {
      this.port.write(fullCommand, (err) => {
        if (err) {
          console.error('[ArduinoService] Error sending command:', err.message);
          reject(err);
        } else {
          console.log('[ArduinoService] Command sent:', fullCommand.trim());
          if (command === 'GET_STATUS') {
            let statusBuffer = '';
            const timeout = setTimeout(() => {
              console.error('[ArduinoService] Timeout waiting for Arduino response');
              reject(new Error('Timeout waiting for Arduino response'));
            }, 10000);

            const dataHandler = (data) => {
              statusBuffer += data.toString();
              const jsonMatch = statusBuffer.match(/\{[^]*\}/);
              if (jsonMatch) {
                clearTimeout(timeout);
                this.port.removeListener('data', dataHandler);
                try {
                  const parsedStatus = JSON.parse(jsonMatch[0]);
                  console.log('[ArduinoService] Received status from Arduino:', parsedStatus);
                  this.latestData = {
                    waterLevel: parsedStatus.waterLevel,
                    temperature: parsedStatus.temperature,
                    humidity: parsedStatus.humidity,
                    lightLevel: parsedStatus.lightLevel,
                    feedingActive: parsedStatus.feedingActive,
                    waterActive: parsedStatus.waterActive,
                    water2Active: parsedStatus.water2Active, // Ajout pour la deuxième pompe
                    ledState: parsedStatus.ledState,
                    pumpState: parsedStatus.pumpState,
                    pump2State: parsedStatus.pump2State, // Ajout pour la deuxième pompe
                    servoPosition: parsedStatus.servoPosition,
                    lampState: parsedStatus.lampState,
                    timestamp: new Date()
                  };
                  resolve(JSON.stringify(parsedStatus));
                } catch (parseError) {
                  console.error('[ArduinoService] Error parsing status JSON:', parseError.message, 'Data:', statusBuffer);
                  reject(parseError);
                }
              }
            };

            this.port.on('data', dataHandler);
          } else {
            this.port.drain((err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        }
      });
    });
  }

  getLatestData() {
    if (!this.latestData) {
      console.log('[ArduinoService] No data available');
      return null;
    }
    const age = new Date() - new Date(this.latestData.timestamp);
    const result = {
      ...this.latestData,
      isMock: this.isMockMode,
      isStale: age > 60000 // Plus de 1 minute
    };
    console.log('[ArduinoService] Returning latest data:', result);
    return result;
  }

  isConnected() {
    return this.port && this.port.isOpen;
  }
}


const arduinoServiceInstance = new ArduinoService();
module.exports = {
  initialize: () => arduinoServiceInstance,
  instance: arduinoServiceInstance
};
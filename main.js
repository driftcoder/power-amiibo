var fs = require('fs');

var HID = require('node-hid');

var WELCOME_MESSAGE = 'Amiibo Clone Maker v.0.1';

console.log(WELCOME_MESSAGE);
console.log('');

var command = process.argv[2];
var path = process.argv[3];

if (
  !['read', 'write'].includes(command) ||
  !path
) {
  printUsage();
  quit();
}

if (command == 'read' && fs.existsSync(path)) {
  quit('File already exists.');
}

if (command == 'write' && !fs.existsSync(path)) {
  quit('File does not exist.');
}

try {
  var device = new HID.HID(7194, 985);
} catch(e) {
  quit('Device Not Found!');
}

setLedBrightness(device, 0);
console.log('Waiting for', command == 'read' ? 'Amiibo' : 'tag', '...');

setInterval(() => {
  var status = getStatus(device);

  if (status[0] == 1) {
    return;
  }

  console.log(command == 'read' ? 'Amiibo' : 'tag', 'found');
  console.log();

  command == 'read' && writeAmiiboToFile(device, path);
  command == 'write' && writeAmiiboToTag(device, path);

  quit('Done.');
}, 1000);

function printUsage() {
  console.log('Usage: node main.js <command> <path>');
  console.log('');
  console.log('Commands:');
  console.log('    read     Reads Amiibo and writes it to a file.');
  console.log('    write    Reads a file and writes it to a tag.');
}

function quit(message = null) {
  message && console.log(message);
  process.exit();
}

function getStatus(device) {
  device.write(getCommand([0x11]));
  device.readSync();
  device.write(getCommand([0x10]));
  device.readSync();
  device.write(getCommand([0x12]));

  return device.readSync();
}

function setLedBrightness(device, value) {
  value = Math.max(0, Math.min(255, Math.round(value * 255)));

  device.write(getCommand([0x20, value]));
}

function writeAmiiboToFile(device, path) {
  var data = [];

  //34 16bytes pages
  for (i = 0; i <= 33; i++) {
    device.write(getCommand([0x1C, i * 4]));
    data = data.concat(device.readSync().slice(2, 18));
  }

  //4 bytes extra
  data = data.slice(0, -4);

  data.forEach((byte, index) => {
    process.stdout.write(('00' + byte.toString(16)).slice(-2) + ' ');

    if ((index + 1) % 16 == 0) {
      console.log();
    } else if ((index + 1) % 8 == 0) {
      process.stdout.write('| ');
    }
  });

  console.log();
}

function writeAmiiboToTag(device, path) {
  var data = fs.readFileSync(path);
  data = Array.prototype.slice.call(data, 0);

  // 135 4byte pages
  for (i = 0; i <= 134; i++) {
    device.write(getCommand([0x1D, i].concat(data.slice(i * 4, (i * 4) + 4))));
    console.log(device.readSync().toString('hex'));
  }
}

function getCommand(command) {
  command = command.concat(Array(64).fill(0xCD)).slice(0, 64);

  if(/^win/.test(process.platform)) {
    // If we are on windows we need to prepend 0x01 to the command
    command = [0x01].concat(command);
  }

  return command;
}

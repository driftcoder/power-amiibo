var child_process = require('child_process');
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
console.log('Waiting for tag ...');

setInterval(() => {
  var status = getStatus(device);

  if (status[0] == 1) {
    return;
  }

  console.log('Tag found');
  console.log();

  command == 'read' && readTag(device, path);
  command == 'write' && writeTag(device, path);

  quit('Done.');
}, 1000);

function printUsage() {
  console.log('Usage: node main.js <command> <path>');
  console.log('');
  console.log('Commands:');
  console.log('    read');
  console.log('    write');
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

function readTag(device, path) {
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

function writeTag(device, path) {
  var data = [];

  device.write(getCommand([0x1C, 0]));
  var serial = device.readSync().slice(2, 18);

  // Change the serial of the bin file
  child_process.execFileSync('amiitool', ['-d', '-k', 'retail.bin', '-i', path, '-o', 'temp.bin']);
  data = fs.readFileSync('temp.bin');
  data[468] = serial[0];
  data[469] = serial[1];
  data[470] = serial[2];
  data[471] = serial[3];
  data[472] = serial[4];
  data[473] = serial[5];
  data[474] = serial[6];
  data[475] = serial[7];
  fs.writeFileSync('temp.bin', data);

  child_process.execFileSync('amiitool', ['-e', '-k', 'retail.bin', '-i', 'temp.bin', '-o', 'signed.bin']);

  data = fs.readFileSync('signed.bin');
  data = Array.prototype.slice.call(data, 0);

  // Write the main data
  for (i = 3; i <= 129; i++) {
    device.write(getCommand([0x1D, i].concat(data.slice(i * 4, (i * 4) + 4))));
    device.readSync();
  }

  // Write pack
  device.write(getCommand([0x1D, 134, 0x80, 0x80, 0x00, 0x00]));
  device.readSync();

  // Write password
  device.write(getCommand([0x1D, 133].concat(getPassword(serial))));
  device.readSync();

  // Write locks
  device.write(getCommand([0x1D, 2, serial[8], serial[9], 0x0F, 0xE0]));
  device.readSync();
  device.write(getCommand([0x1D, 130, 0x01, 0x00, 0x0F, 0x00]));
  device.readSync();
  device.write(getCommand([0x1D, 131, 0x00, 0x00, 0x00, 0x04]));
  device.readSync();
  device.write(getCommand([0x1D, 132, 0x5F, 0x00, 0x00, 0x00]));
  device.readSync();
}

function getPassword(serial) {
  return [
    serial[1] ^ serial[4] ^ 0xAA,
    serial[2] ^ serial[5] ^ 0x55,
    serial[4] ^ serial[6] ^ 0xAA,
    serial[5] ^ serial[7] ^ 0x55,
  ];
}

function getCommand(command) {
  command = command.concat(Array(64).fill(0xCD)).slice(0, 64);

  if(/^win/.test(process.platform)) {
    // If we are on windows we need to prepend 0x01 to the command
    command = [0x01].concat(command);
  }

  return command;
}

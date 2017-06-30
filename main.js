var fs = require('fs');

var HID = require('node-hid');

var device = new HID.HID(7194, 985);

setLedBrightness(device, 0);

var block = false;

setInterval(() => {
  if (block) {
    return;
  }

  block = true;
  var status = getStatus(device);

  if (status[0] == 1) {
    setLedBrightness(device, 0);
    block = false;
    return;
  }

  setLedBrightness(device, 1);

  console.log();

  readNFC(device).forEach((byte, index) => {
    process.stdout.write(('00' + byte.toString(16)).slice(-2) + ' ');

    if ((index + 1) % 16 == 0) {
      console.log();
    } else if ((index + 1) % 8 == 0) {
      process.stdout.write('| ');
    }

  });

  console.log();

  //writeNFC(device);
  process.exit();
}, 1000);

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

function readNFC(device) {
  var data = [];

  //34 16bytes pages
  for (i = 0; i <= 33; i++) {
    device.write(getCommand([0x1C, i * 4]));
    data = data.concat(device.readSync().slice(2, 18));
  }

  //4 bytes extra
  return data.slice(0, -4);
}

function writeNFC(device) {
  var data = fs.readFileSync('test.bin');
  data = Array.prototype.slice.call(data, 0);

  // 135 4byte pages
  for (i = 0; i <= 134; i++) {
    device.write(getCommand([0x1D, i].concat(data.slice(i * 4, (i * 4) + 4))));
  }

  process.exit();
}

function getCommand(command) {
  command = command.concat(Array(64).fill(0xCD)).slice(0, 64);

  if(/^win/.test(process.platform)) {
    // If we are on windows we need to prepend 0x01 to the command
    command = [0x01].concat(command);
  }

  return command;
}

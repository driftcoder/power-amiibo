var HID = require('node-hid');

var device = new HID.HID(7194, 985);

//1C is readin 00 - ??
//device.write(COMMAND_02);
//device.readSync();
//device.write(COMMAND_90);
//device.readSync();
//device.write(COMMAND_80);
//device.readSync();
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
  console.log(readNFC(device));
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
  //33 pages of data
  for (i = 0; i <= 33; i++) {
    device.write(getCommand([0x1C, i * 4]));
    data = data.concat(device.readSync().slice(2, 18));
  }

  return data.slice(0, -4);
}

function getCommand(command) {
  command = command.concat(Array(64).fill(0xCD)).slice(0, 64);

  if(/^win/.test(process.platform)) {
    // If we are on windows we need to prepend 0x01 to the command
    command = [0x01].concat(command);
  }

  return command;
}

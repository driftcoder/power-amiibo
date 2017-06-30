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
  device.write([0x01, 0x11].concat(Array(63).fill(0xCD)));
  device.readSync();
  device.write([0x01, 0x10].concat(Array(63).fill(0xCD)));
  device.readSync();
  device.write([0x01, 0x12].concat(Array(63).fill(0xCD)));

  return device.readSync();
}

function setLedBrightness(device, value) {
  value = Math.round(value * 255);
  value = Math.max(0, Math.min(255, value));

  device.write([0x01, 0x20, value].concat(Array(62).fill(0xCD)));
}

function readNFC(device) {
  var data = [];
  //33 pages of data
  for (i = 0; i <= 33; i++) {
    device.write([0x01, 0x1C, i * 4].concat(Array(62).fill(0xCD)));
    data = data.concat(device.readSync().slice(2, 18));
  }

  return data.slice(0, -4);
}

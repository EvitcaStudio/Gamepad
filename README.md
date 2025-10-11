# GamepadManager v3.0.0

A modern TypeScript library for handling gamepad input in web applications.

## Installation

### Module

```javascript
import { GamepadManager } from './dist/esm/gamepad.js';
```


## Quick Start

```javascript
// Listen for controller connections
GamepadManager.on('connect', (controller) => {
  console.log(`Controller connected: ${controller.getDisplayName()}`);
  
  // Set up event listeners
  controller.addEventListener('buttondown', (button, value) => {
    console.log(`${button} pressed with value: ${value}`);
  });
  
  controller.addEventListener('axischange', (axis, value, angle) => {
    console.log(`${axis} moved to ${value} at angle ${angle}`);
  });
  
  // Test vibration
  controller.vibratePreset('light-tap');
});

// Start listening for controllers
GamepadManager.on('disconnect', (controller) => {
  console.log('Controller disconnected');
});
```

## Complete Guide

### Controller Management

```javascript
// Get all connected controllers
const controllers = GamepadManager.getControllers(); // Controller[]

// Get the main controller (first connected by default)
const mainController = GamepadManager.getMainController(); // Controller | null

// Get a specific controller by index
const controller = GamepadManager.getController(0); // Controller | null

// Set a different controller as main
GamepadManager.setMainController(1); // boolean

// Get controllers with metadata
const metadata = GamepadManager.getControllersWithMetadata();
// Returns: Array<{controller: Controller, index: number, isMain: boolean, connectionOrder: number}>
```

### Event System

The library uses an event system:

```javascript
controller.addEventListener('buttondown', (buttonName, value) => {
  // Fired once when button is initially pressed
  console.log(`${buttonName} pressed: ${value}`);
});

controller.addEventListener('buttonpress', (buttonName, value, repeat) => {
  // Fired continuously while button is held
  console.log(`${buttonName} held: ${value} (repeat: ${repeat})`);
});

controller.addEventListener('buttonup', (buttonName, value) => {
  // Fired once when button is released
  console.log(`${buttonName} released: ${value}`);
});

controller.addEventListener('axischange', (axisName, value, angle, repeat) => {
  // Fired when analog axis value changes
  console.log(`${axisName}: ${value} at angle ${angle}`);
});

controller.addEventListener('grab', (analogName) => {
  // Fired when analog stick starts being used
  console.log(`${analogName} analog grabbed`);
});

controller.addEventListener('drop', (analogName) => {
  // Fired when analog stick is released
  console.log(`${analogName} analog dropped`);
});

// Global button event - fires for all button changes
controller.addEventListener('button', (buttonName, value, action) => {
  console.log(`${buttonName}: ${value} (${action})`);
  
  // Handle different actions
  if (action === 'pressed') {
    console.log(`${buttonName} was just pressed`);
  } else if (action === 'released') {
    console.log(`${buttonName} was just released`);
  } else if (action === 'held') {
    console.log(`${buttonName} is being held`);
  }
});
```

**Note:** Event names are case agnostic - `'buttondown'`, `'ButtonDown'`, `'BUTTONDOWN'` all work the same way.

### ButtonAction Type

The `ButtonAction` type defines the possible actions for the global button event:

- **`'pressed'`** - Button was just pressed (transition from not pressed to pressed)
- **`'held'`** - Button is being held down (continuous while pressed)  
- **`'released'`** - Button was just released (transition from pressed to not pressed)

### Controller Information

```javascript
// Get controller type (automatically detected)
const type = controller.getType(); // 'Xbox', 'PS', 'NS', 'PC', 'Standard', 'Generic'

// Get human-readable name
const name = controller.getDisplayName(); // "Xbox Controller (Standard)"

// Check feature support
if (controller.hasHapticSupport()) {
  console.log('Vibration supported');
}

if (controller.hasMotionSupport()) {
  console.log('Motion sensors supported');
}

if (controller.hasTouchpadSupport()) {
  console.log('Touchpad supported');
}
```

### Dead Zone Configuration

Dead zones prevent unwanted input from analog stick drift and small movements. Values below the threshold are treated as 0.

```javascript
// Set global dead zone (default: 0.0 - no dead zone)
controller.setDeadZone(0.15); // 15% dead zone - ignores small movements

// Set separate dead zones for each analog stick
controller.setLeftAnalogDeadZone(0.1);  // 10% for left stick
controller.setRightAnalogDeadZone(0.2); // 20% for right stick

// Get current dead zone values
const globalDeadZone = controller.getDeadZone();
const leftDeadZone = controller.getLeftAnalogDeadZone();
const rightDeadZone = controller.getRightAnalogDeadZone();
```

**How it works:**
- `0.0` = No dead zone (all movement detected)
- `0.15` = 15% dead zone (ignores small movements, prevents drift)
- `1.0` = Maximum dead zone (only full stick movement detected)
- Higher values = more input ignored, better for preventing drift
- Lower values = more sensitive, detects smaller movements

### Analog Stick Data

```javascript
// Get detailed analog stick information
const leftStick = controller.getLeftAnalogPosition();
console.log(leftStick); 
// { x: 0.5, y: -0.3, magnitude: 0.58, angle: -0.64 }

const rightStick = controller.getRightAnalogPosition();
console.log(rightStick);
// { x: 0.0, y: 0.0, magnitude: 0.0, angle: 0.0 }

// Check if analog sticks are being used
if (controller.isLeftAnalogHeld()) {
  console.log('Left stick is being used');
}

if (controller.isRightAnalogHeld()) {
  console.log('Right stick is being used');
}
```

### Button Input

```javascript
// Check if specific buttons are pressed
if (controller.isButtonPressed('A')) {
  console.log('A button is pressed');
}

// Get all currently pressed buttons
const pressedButtons = controller.getPressed();
console.log('Pressed buttons:', pressedButtons); // ['A', 'LT', 'UP']

// Get reactive button states
const buttonStates = controller.getButtonStates();
console.log(buttonStates);
// { A: { pressed: true, value: 1.0 }, LT: { pressed: true, value: 0.7 }, ... }

// Get complete controller state
const state = controller.getState();
console.log(state);
// { type: 'Xbox', index: 0, buttons: {...}, analogs: {...}, deadZones: {...} }
```

**Note:** Button names are case agnostic - `'A'`, `'a'`, `'LB'`, `'lb'` all work the same way.

### Haptic Feedback

```javascript
// Use vibration presets
await controller.vibratePreset('light-tap');
await controller.vibratePreset('heavy-shake', 500); // With 500ms delay

// Custom vibration
await controller.vibrate('dual-rumble', 0, 1000, 0.5, 1.0);
// Parameters: type, startDelay, duration, weakMagnitude, strongMagnitude

// Complex vibration patterns
await controller.vibratePattern([
  { delay: 0, duration: 100, weak: 0.5, strong: 0.5 },
  { delay: 200, duration: 100, weak: 1.0, strong: 1.0 },
  { delay: 400, duration: 200, weak: 0.3, strong: 0.8 }
]);

// Stop all vibrations
controller.stopVibration();
```

### Available Vibration Presets

```javascript
Controller.VIBRATION_PRESETS = {
  'light-tap': { duration: 50, weak: 0.3, strong: 0.3 },
  'medium-rumble': { duration: 200, weak: 0.6, strong: 0.6 },
  'heavy-shake': { duration: 400, weak: 1.0, strong: 1.0 },
  'notification': { duration: 100, weak: 0.5, strong: 0.2 },
  'damage': { duration: 150, weak: 0.8, strong: 1.0 }
};
```

**Note:** All preset names are case agnostic - `'light-tap'`, `'LIGHT-TAP'`, and `'Light-Tap'` all work the same way.

## Button Names

### Standard Buttons
- **A**, **B**, **X**, **Y** - Face buttons
- **LB**, **RB** - Left/Right Bumper
- **LT**, **RT** - Left/Right Trigger (analog 0.0-1.0)
- **BACK**, **START** - Menu buttons
- **LS**, **RS** - Left/Right Stick click
- **UP**, **DOWN**, **LEFT**, **RIGHT** - D-pad
- **HOME**, **OPTION** - System buttons

### PlayStation Controllers
PlayStation controllers automatically map to PlayStation button names:
- **A** → **CROSS**
- **B** → **CIRCLE**
- **X** → **SQUARE**
- **Y** → **TRIANGLE**

### Analog Axes
- **LEFT_X**, **LEFT_Y** - Left analog stick
- **RIGHT_X**, **RIGHT_Y** - Right analog stick
## API Reference

### GamepadManager

| Method | Description | Returns |
|--------|-------------|---------|
| `getMainController()` | Get the main controller | `Controller \| null` |
| `getController(index)` | Get controller by index | `Controller \| null` |
| `getControllers()` | Get all controllers | `Controller[]` |
| `getControllersWithMetadata()` | Get controllers with metadata | `Array<{controller, index, isMain, connectionOrder}>` |
| `setMainController(index)` | Set main controller | `boolean` |
| `on(event, callback)` | Add event listener | `GamepadManager` |

### Controller

| Method | Description | Returns |
|--------|-------------|---------|
| `getType()` | Get controller type | `string` |
| `getDisplayName()` | Get human-readable name | `string` |
| `hasHapticSupport()` | Check vibration support | `boolean` |
| `hasMotionSupport()` | Check motion sensor support | `boolean` |
| `hasTouchpadSupport()` | Check touchpad support | `boolean` |
| `setDeadZone(value)` | Set global dead zone | `void` |
| `setLeftAnalogDeadZone(value)` | Set left stick dead zone | `void` |
| `setRightAnalogDeadZone(value)` | Set right stick dead zone | `void` |
| `getDeadZone()` | Get global dead zone | `number` |
| `getLeftAnalogDeadZone()` | Get left stick dead zone | `number` |
| `getRightAnalogDeadZone()` | Get right stick dead zone | `number` |
| `getLeftAnalogPosition()` | Get left stick data | `AnalogPosition` |
| `getRightAnalogPosition()` | Get right stick data | `AnalogPosition` |
| `isLeftAnalogHeld()` | Check if left stick is used | `boolean` |
| `isRightAnalogHeld()` | Check if right stick is used | `boolean` |
| `isButtonPressed(button)` | Check if button is pressed | `boolean` |
| `getPressed()` | Get pressed buttons | `string[]` |
| `getButtonStates()` | Get button states | `ButtonStates` |
| `getAnalogStates()` | Get analog states | `AnalogStates` |
| `getState()` | Get complete state | `ControllerState` |
| `vibrate(type, delay, duration, weak, strong)` | Custom vibration | `Promise<void>` |
| `vibratePreset(preset, delay)` | Use vibration preset | `Promise<void>` |
| `vibratePattern(pattern)` | Complex vibration | `Promise<void>` |
| `stopVibration()` | Stop all vibrations | `void` |
| `addEventListener(event, callback, options)` | Add event listener | `Controller` |
| `removeEventListener(event, callback)` | Remove event listener | `Controller` |

### Events

| Event | Description | Parameters |
|-------|-------------|------------|
| `connect` | Controller connected | `(controller: Controller)` |
| `disconnect` | Controller disconnected | `(controller: Controller)` |
| `button` | All button changes (global) | `(button: string, value: number, action: ButtonAction)` |
| `buttondown` | Button initially pressed | `(button: string, value: number)` |
| `buttonpress` | Button held (continuous) | `(button: string, value: number, repeat: boolean)` |
| `buttonup` | Button released | `(button: string, value: number)` |
| `axischange` | Analog axis changed | `(axis: string, value: number, angle: number, repeat: boolean)` |
| `analogmove` | Alias for axischange | `(axis: string, value: number, angle: number, repeat: boolean)` |
| `grab` | Analog stick grabbed | `(analog: string)` |
| `drop` | Analog stick released | `(analog: string)` |

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Author

Created by [doubleactii](https://github.com/doubleactii)

## Documentation

- [API Documentation](https://evitcastudio.github.io/Gamepad/)
- [Test Suite](./index.html)
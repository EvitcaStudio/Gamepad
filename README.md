# GamepadManager Module
GamepadManager is a Javascript library that provides an easy way to handle input from game controllers. It is designed to work with the Gamepad API, which is a browser API that provides access to gamepad devices. This library is useful for games and other applications that require input from a game controller.

## Installation

### ES Module

```js
import { GamepadManager } from './gamepad.mjs';
```

### IIFE (Immediately Invoked Function Expression)

```js
<script src="gamepad.js"></script>;
// ...
window.GamepadBundle.GamepadManager;
```

# Features
Handles input from multiple game controllers simultaneously.
Supports all types of game controllers supported by the Gamepad API, including Bluetooth controllers.
Provides an easy-to-use API for accessing input from game controllers.
Includes event handlers for detecting when game controllers are connected or disconnected.
Supports remapping of controller buttons to match different controller layouts.

# Usage

The GamepadManager object provides several methods for accessing input from game controllers. For example, you can get the main controller like this:

```js
var controller = GamepadManager.getMainController();
```

You can also get a list of all connected controllers like this:

```js
var controllers = GamepadManager.getControllers();
```
The GamepadManager object also includes event handlers for detecting when game controllers are connected or disconnected. For example, to handle the "connect" event, you can use the following code:

```js
GamepadManager.on('connect', function(pController) {
    // Do something when a controller is connected.
    pController.on('press', (pButtonName, pValue, pRepeat) => {
        // Do something when a controller presses a button
    }).on('release', (pButtonName, pValue) => {
        // Do something when a controller releases a button
    }).on('axis', (pAxisName, pValue, pAngle, pRepeat) => {
        // Do something when a controller moves its analogs
    }).on('grab', (pAnalogName) => {
        // Do something when an analog is touched or moved from the "drop off zone" (center position)
    }).on('drop', (pAnalogName) => {
        // Do something when an analog is not being touched anymore or has been moved to the "drop off zone" (center position)
    });

    pController.vibrate('dual-rumble', 0, 1000, 1, 1); // Vibrate the controller with customizable settings
    pController.isLeftAnalogHeld(); // Returns a boolean
    pController.isRightAnalogHeld(); // Returns a boolean
    pController.isButtonPressed('A'); // Returns a boolean
    pController.getType(); // Returns the type this controller is. PC / PS / Xbox/ Android
});

GamepadManager.on('disconnect', function(pController) {
    // Do something when a controller is disconnected.
});
```
# License
GamepadManager is free software, available under the terms of a MIT style License.

# Author
GamepadManager was created by doubleactii.

# [Docs](https://evitcastudio.github.io/Gamepad/)

# TODO
Currently, Bluetooth gamepads when disconnecting (PS4 only) do not fire a disconnected event. Manually calling this.gamepad.vibrationActuator.reset() can force it to call a disconnect event, but this is a messy way of checking each tick to see if the gamepad is still connected. It also will cancel ongoing vibrations. A fix needs to be found. (This is a GamepadAPI issue/OS issue/not a code-wise issue)

### Global Dependency

Gamepad relies on the `VYLO` variable being globally accessible.

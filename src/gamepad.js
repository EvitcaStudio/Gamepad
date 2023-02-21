/**
 * A gamepadmanager to help with games / handling input from a controller
 * @class GamepadManagerSingleton
 * @license GamepadManager does not have a license at this time. For licensing contact the author
 * @author https://github.com/doubleactii
 * @todo Currently bluetooth gamepads when disconnecting (PS4 only) do no fire a disconnected event. Manually calling `this.gamepad.vibrationActuator.reset()` can force it to call a disconnect event, but 
 * this is a messy way of checking each tick to see if the gamepad is still connected. It also will cancel ongoing vibrations. Find a fix. (This is a GamepadAPI issue/OS issue/not code wise issue)
 * Copyright (c) 2023 Evitca Studio
 */
class GamepadManagerSingleton {
	/**
	 * The version of this module
	 * 
	 * @type {string}
	 */
	static version = '1.0.0';
	/**
	 * Object containing all connected controllers
	 * 
	 * @type {Object}
	 */
	controllers = {};
	/**
	 * Object containing the callback for when a controller is connected
	 * 
	 * @type {Object}
	 */
	connectHandler = {};
	/**
	 * Object containing the callback for when a controller is disconnected
	 * 
	 * @type {Object}
	 */
	disconnectHandler = {};
	/**
	 * Creates the instance and assigns event handlers to gamepad events
	 */
	constructor() {
		// Bind this class instance to the event handlers
		this.handleGamepadConnected = this.handleGamepadConnected.bind(this);
		this.handleGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
		this.pollGamepadState = this.pollGamepadState.bind(this);

		// Check for gamepad support
		if ('getGamepads' in navigator) {
			window.addEventListener('gamepadconnected', this.handleGamepadConnected);
			window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
			requestAnimationFrame(this.pollGamepadState);
		} else {
			console.warn('Gamepad API not supported in this browser.');
		}
	}
	/**
	 * This gets the first controller connected. This controller is dominant
	 * 
	 * @returns {Gamepad} The first controller connected
	 */
	getMainController() {
		return this.controllers['0'];
	}
	/**
	 * @returns {Array} An array of all connected controllers
	 */
	getControllers() {
		return { ...this.controllers };
	}
    /**
     * @typedef {Object} Event
     * @property {string} event - The event name
     * @property {function} callback - The function to be called when the event is triggered
     */
    /**
     * Attaches a callback to the specified event.
	 * 
     * @param {Event['event']} pEvent - The event to attach the callback to
     * @param {Event['callback']} pCallback - The function to be called when the event is triggered
     * @return {GamepadManagerSingleton} The GamepadManagerSingleton instance
     */
	on(pEvent, pCallback) {
		if (typeof(pEvent) === 'string') {
			if (typeof(pCallback) === 'function') {
				switch (pEvent) {
					case 'connect':
						this.connectHandler[pEvent] = pCallback;
						break;

					case 'disconnect':
						this.disconnectHandler[pEvent] = pCallback;
						break;

					default:
						console.error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				console.error(`The callback for event "${pEvent}" is not a function.`);
			}
		}
		return this;
	}
	/**
	 * Listener function for when a gamepad is connected
	 * 
	 * @param {pGamepadEvent} - A gamepad event
	 */
	handleGamepadConnected(pGamepadEvent) {
		// Create a controller from the gamepad that was connected
		// This controller only saves a snapshot of the data of when it was first created, but we update it based on new polled data
		this.controllers[pGamepadEvent.gamepad.index] = new Controller(pGamepadEvent.gamepad);
		if (typeof(this.connectHandler.connect) === 'function') this.connectHandler.connect(this.controllers[pGamepadEvent.gamepad.index]);
	}
	/**
	 * Listener function for when the gamepad is disconnected
	 * 
	 * @param {pGamepadEvent} - A gamepad event
	 */
	handleGamepadDisconnected(pGamepadEvent) {
		// Delete the controller when it's disconnected
		// Maybe add a option to save gamepad info for a short while, incase it disconnected due to battery? 
		// When reconnected it can prompt an alert that says "restore configuration for gamepad". This will restore that configuration to the controller.
		if (typeof(this.disconnectHandler.disconnect) === 'function') this.disconnectHandler.disconnect(this.controllers[pGamepadEvent.gamepad.index]);
		delete this.controllers[pGamepadEvent.gamepad.index];
	}
	/**
	 * Get the latest game state of the connected gamepads (Chrome only saves snapshots of the state, we have to keep polling to get updated states)
	 */
	pollGamepadState() {
		const gamepads = navigator.getGamepads();
		if (!gamepads) {
			return;
		}
		// Loop through all connected controllers and update their state
		for (const gamepad of gamepads) {
			for (const controller in this.controllers) {
				// Can be null if disconnected during the session
				if (gamepad) {
					// Make sure we are updating the correct controller with the right data from the gamepad at the same index
					if (gamepad.index === this.controllers[controller].gamepad.index) {
						this.controllers[controller].updateState(gamepad);
					}
				}
			}
		}
		requestAnimationFrame(this.pollGamepadState);
	}
}

class Controller {
	config = {
		// Analog thumb sticks
		axes: {
			'LEFT_X': 0, // Left axis
			'LEFT_Y': 1, // Left axis 
			'RIGHT_X': 2,
			'RIGHT_Y': 3,
		},
		// Buttons
		buttons: (() => { return { ...Controller.BUTTONS_MAP }})()
	}
	/**
	 * The range at which axis changes are detected
	 */
	static AXIS_UPDATE_RANGE = 0.0; // 0.2
	/**
	 * A button map that maps common button names to the indexes the computer knows them as
	 */
	static BUTTONS_MAP = {
		'A': 0, // Main action button (⨉) PS4
		'B': 1, // Secondary action button (Ο) PS4
		'X': 2, // Third action button (▢) PS4
		'Y': 3, // Fourth action button (∆) PS4
		'LB': 4, // Left bumper or shoulder button
		'RB': 5, // Right bumper or shoulder button
		'LT': 6, // Left trigger button (analog)
		'RT': 7, // Right trigger button (analog)
		'BACK': 8, // Back button
		'START': 9, // Start button
		'LS': 10, // Click of the left stick L3
		'RS': 11, // Click of the right stick R3
		'UP': 12, // D-pad up
		'DOWN': 13, // D-pad down
		'LEFT': 14, // D-pad left
		'RIGHT': 15, // D-pad right
		'HOME': 16, // Home button (not available on all controllers)
		'OPTION': 17 // Option button (not available on all controllers)
	}
	/**
	 * A reverse map of the button names
	 */
	static BUTTONS_REVERSE_MAP = (() => { 
		const reversedMap = {};
		for (const button in Controller.BUTTONS_MAP) {
			const index = Controller.BUTTONS_MAP[button];
			reversedMap[index] = button;
		}
		return reversedMap;
	})()
	/**
	 * A small remapped version of the controllers button_map with PS4 alternatives
	 */
	static PS4_REMAPPED = {
		'A': 'CROSS', // Main action button (⨉) PS4
		'B': 'CIRCLE', // Secondary action button (Ο) PS4
		'X': 'SQUARE', // Third action button (▢) PS4
		'Y': 'TRIANGLE', // Fourth action button (∆) PS4		
	}
	/**
	 * PS: Playstation vendor
	 * Xbox: XBOX vendor
	 * PC: Computer PC vendor
	 * Android: Android device vendor
	 */
	static GAMEPAD_IDS = {
		'Xbox 360 Controller (XInput STANDARD GAMEPAD)': 'Xbox',
		'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)': 'PS',
		'045E-02EA-Microsoft X-Box 360 pad': 'Xbox',
		'045E-028E-Microsoft X-Box One pad': 'Xbox',
		'045E-02DD-Microsoft X-Box One pad (Firmware 2015)': 'Xbox',
		'054C-05C4-Sony Computer Entertainment Wireless Controller': 'PS',
		'054C-09CC-Sony PLAYSTATION(R)3 Controller': 'PS',
		'057E-2009-Switch Pro Controller': 'NS', // Nintendo Switch
		'06A3-0D09-Logitech F310 Gamepad (XInput)': 'PC',
		'06A3-0D0A-Logitech F510 Gamepad (XInput)': 'PC',
		'06A3-0D0B-Logitech F710 Gamepad (XInput)': 'PC',
		'0738-4716-Controller (Xbox Wireless Receiver for Windows)': 'Xbox',
		'0796-5510-DualShock 4 Wireless Controller': 'PS',
		'0E6F-0213-PS3/PC Gamepad': 'PS',
		'0E6F-0501-XInput Gamepad': 'PC',
		'0E6F-0801-PS4 Wired Gamepad': 'PS',
		'24C6-5503-NAAC Wired Compact Controller for PS': 'PS',
		'2DC8-6101-Moga Pro': 'Android',
		'2DC8-7101-Moga Hero Power': 'Android',
		'2DC8-9101-Moga Power Pro': 'Android',
		'2DC8-F101-Moga Pro Power': 'Android',
		'2DC8-F301-Moga Hero Power (B) ': 'Android',
		'24C6-541A-Revolution Pro Controller': 'PS',
		'146B-0601-PC Gamepad': 'PC'
	};
	info = {
		axes: null,
		buttons: null,
		previousButtonState: [],
		previousAxesState: []
	}
	/**
	 * Object of stored callback that will call when a button is pressed
	 * 
	 * @type {Object}
	 */
	pressHandlers = {};
	/**
	 * Object of stored callback that will call when a button is released
	 * 
	 * @type {Object}
	 */
	releaseHandlers = {};
	/**
	 * Object of stored callbacks that will call when the axis is changed
	 * 
	 * @type {Object}
	 */
	axisHandlers = {};
	/**
	 * Creates a new controller instance and passes the gamepad it will be created with
	 * 
	 * @param {Gamepad} pGamepad - A gamepad object
	 */
	constructor(pGamepad) {
		this.gamepad = pGamepad;
		this.type = Controller.GAMEPAD_IDS[this.gamepad.id] ? Controller.GAMEPAD_IDS[this.gamepad.id] : 'Generic';
	}
	/**
	 * Update the state of this controller with the latest polled information
	 * 
	 * @param {Gamepad} - The gamepad with the new updated state
	 */
	updateState(pGamepad) {
		const { buttons: newButtonState, axes: newAxesState } = pGamepad;

		// Update the controllers info with the latest state (not the gamepad, as those are read only vars)
		this.info.buttons = newButtonState;
		this.info.axes = newAxesState;

		// Loop through buttons and check for button and axis changes
		for (let i = 0; i < newButtonState.length; i++) {
			// Get the button data
			const buttonStillHeld = (newButtonState[i].pressed && this.info.previousButtonState[i]);
			const buttonValue = newButtonState[i].value;
			const buttonTouched = newButtonState[i].touched;

			if (newButtonState[i].pressed && buttonStillHeld) {
				this.handleButtonInput(i, buttonValue, buttonTouched, buttonStillHeld);
			} else if (newButtonState[i].pressed && !this.info.previousButtonState[i]) {
				// Button was pressed
				this.handleButtonInput(i, buttonValue, buttonTouched, buttonStillHeld);
			} else if (!newButtonState[i].pressed && this.info.previousButtonState[i]) {
				// Button was released
				this.handleButtonInput(i, buttonValue, buttonTouched, buttonStillHeld);
			}
			this.info.previousButtonState[i] = newButtonState[i].pressed;
		}

		// Loop through the axis and check for changes
		/**
		 * Changes will almost always occur, so to prevent this spammy behavior we check in ranges. This range can be tweaked 0.2 is default
		 */
		for (let i = 0; i < newAxesState.length; i++) {
			// Check and see if the axis value changed significantly, we can tweak this value or maybe set it to a user defined value?
			// We also check if this value is set, if not we allow it to be set with the current data
			const axesStillHeld = (newAxesState[i] === this.info.previousAxesState[i]);
			if (axesStillHeld || Math.abs(newAxesState[i] - this.info.previousAxesState[i]) > Controller.AXIS_UPDATE_RANGE || this.info.previousAxesState[i] === undefined) {
				this.handleAxisInput(i, newAxesState[i], axesStillHeld);
				this.info.previousAxesState[i] = newAxesState[i];
			}
		}
	}
    /**
     * Attaches a callback to the specified event.
	 * 
     * @param {Event['event']} pEvent - The event to attach the callback to
     * @param {Event['callback']} pCallback - The function to be called when the event is triggered
     * @return {Controller} The Controller instance
     */
	on(pEvent, pCallback) {
		if (typeof(pEvent) === 'string') {
			if (typeof(pCallback) === 'function') {
				switch (pEvent) {
					case 'press':
						this.pressHandlers[pEvent] = pCallback;
						break;
					case 'release':
						this.releaseHandlers[pEvent] = pCallback;
						break;
					case 'axis':
						this.axisHandlers[pEvent] = pCallback;
						break;
					default:
						console.error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				console.error(`The callback for event "${pEvent}" is not a function.`);
			}
		}
		return this;
	}
    /**
     * Removes a callback from the specified event.
	 * 
     * @param {Event['event']} pEvent - The event to remove the callback from
     * @return {Controller} The Controller instance
     */	
	off(pEvent) {
		if (typeof(pEvent) === 'string') {
			if (typeof(pCallback) === 'function') {
				switch (pEvent) {
					case 'press':
						this.pressHandlers[pEvent] = null;
						break;
					case 'release':
						this.releaseHandlers[pEvent] = null;
						break;
					case 'axis':
						this.axisHandlers[pEvent] = null;
						break;
					default:
						console.error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				console.error(`The callback for event "${pEvent}" is not a function.`);
			}
		}
		return this;
	}
	/**
	 * @param {number} pButton - The button index that was pressed
	 * @param {number} pValue - The value of the button (0 for unpressed, 1 for pressed) 0-1 for buttons that have a range
	 * @param {number} pTouched - Whether this button is being touched at the moment https://developer.mozilla.org/en-US/docs/Web/API/GamepadButton/touched
	 * @param {boolean} pRepeat - Whether this button is still being held from a previous frame
	 */
	handleButtonInput(pButton, pValue, pTouched, pRepeat) {
		let buttonName = pButton;
		// Check if button is mapped
		for (const button in this.config.buttons) {
			if (this.config.buttons[button] === pButton) {
				buttonName = button;
			}
		}
		// Check if any of the main buttons need to be remapped for a PlayStation controller
		if (buttonName === 'A' || buttonName === 'B' || buttonName === 'X' || buttonName === 'Y') {
			// If this controller is a playstation controller
			if (this.type === 'PS') {
				// Change the XBOX controls to Playstation controller controls
				buttonName = Controller.PS4_REMAPPED[buttonName];
			}
		}
		if (buttonName) {
			if (pValue > 0) {
				if (typeof(this.pressHandlers['press']) === 'function') this.pressHandlers['press'](buttonName, pValue, pTouched, pRepeat);
			} else {
				if (typeof(this.pressHandlers['release']) === 'function') this.pressHandlers['release'](buttonName, pValue, pTouched);
			}
		}
	}
	/**
	 * @param {number} pAxis - The axis index that was moved
	 * @param {number} pValue - The value of the axis that was moved (0-1 range)
	 * @param {boolean} pRepeat - Whether this axes is still the same from a previous frame
	 */
	handleAxisInput(pAxis, pValue, pRepeat) {
		let axisName = pAxis;
		// Check if axis is mapped
		for (const axes in this.config.axes) {
			if (this.config.axes[axes] === pAxis) {
				axisName = axes;
			}
		}
		if (axisName) {
			if (typeof(this.axisHandlers['axis']) === 'function') this.axisHandlers['axis'](axisName, pValue, pRepeat);
		}
	}
	/**
	 * Vibrate the controller (experimental)
	 * 
	 * dual-rumble: Dual-rumble describes a haptic configuration with an eccentric rotating mass vibration motor in each handle of a standard gamepad. 
	 * In this configuration, either motor is capable of vibrating the whole gamepad. 
	 * The two masses are unequal so that the effects of each can be combined to create more complex haptic effects.
	 * 
	 * @param {string} pVibrationType - The type of rumble. "dual-rumble", or "vibration"
	 * @param {number} pStartDelay - The start delay before the vibration occurs in ms
	 * @param {number} pWeakMagnitude - The magnitude of the weak actuator (between 0 and 1).
	 * @param {number} pStrongMagnitude - The magnitude of the strong actuator (between 0 and 1).
	 */
	vibrate(pVibrationType = 'dual-rumble', pStartDelay=0, pDuration=1000, pWeakMagnitude=1, pStrongMagnitude=1) {
		if (!('vibrationActuator' in this.gamepad)) {
			return;
		}
		// If a invalid pVibrationType is passed, default it
		if (pVibrationType !== 'dual-rumble' || pVibrationType !== 'vibration') pVibrationType = 'dual-rumble';
		// A new call to playEffect() overrides a previous ongoing call.
		this.gamepad.vibrationActuator.playEffect(pVibrationType, {
			startDelay: pStartDelay,
			duration: pDuration,
			weakMagnitude: pWeakMagnitude,
			strongMagnitude: pStrongMagnitude,
		});
	}
	/**
	 * The pulse() method of the GamepadHapticActuator interface makes the hardware pulse at a certain intensity for a specified duration. (From MDN)
	 * 
	 * @param {number} pValue - A double representing the intensity of the pulse. This can vary depending on the hardware type, but generally takes a value between 0.0 (no intensity) and 1.0 (full intensity).
	 * @param {number} pDuration - A double representing the duration of the pulse, in milliseconds.
	 */
	pulse(pValue=1, pDuration=200) {
		if (!('hapticActuators' in this.gamepad)) {
			return;
		}
		this.gamepad.hapticActuators[0].pulse(pValue, pDuration);
	}
}

export const GamepadManager = new GamepadManagerSingleton();

import { GamepadManager } from './gamepad.mjs';

class Controller {
	/**
	 * Configuration of which buttons / analogs map to which indexes
	 * 
	 * @type {object}
	 */
	config = {
		// Buttons
		buttons: (() => { return { ...Controller.BUTTONS_MAP }})()
	}
	/**
	 * Whether the left analog is currently being held
	 * 
	 * @type {boolean}
	 */
	leftAnalogHeld = false;
	/**
	 * Whether the right analog is currently being held
	 * 
	 * @type {boolean}
	 */
	rightAnalogHeld = false;
	/**
	 * The base analogs position when it is not in use
	 */
	static baseAnalogPos = { x: 0, y: 0 };
	/**
	 * Analog thumb sticks
	 * 
	 * @type {object}
	 */
	static AXES = {
		'LEFT_X': 0, // Left axis
		'LEFT_Y': 1, // Left axis 
		'RIGHT_X': 2,
		'RIGHT_Y': 3,
	}

	static AXES_REVERSED_MAP = (() => { 
		const reversedMap = {};
		for (const axis in Controller.AXES) {
			const index = Controller.AXES[axis];
			reversedMap[index] = axis;
		}
		return reversedMap;
	})()
	/**
	 * The range at which axis changes are detected
	 * 
	 * @type {number}
	 */
	static AXIS_UPDATE_RANGE = 0.0; // 0.2
	/**
	 * The range at which the analog is considered to be dropped -0.09 - 0.09
	 * 
	 * @type {number}
	 */
	static ANALOG_RELEASE_RANGE = 0.09;
	/**
	 * The value at which holding a trigger (LT OR RT) will consider it being pressed
	 */
	static TRIGGER_PRESSED_VALUE = 0.12;
	/**
	 * Value to indicate a pressed button
	 * 
	 * @type {number}
	 */
	static PRESSED = 1.0;
	/**
	 * Value to indicate a button is not pressed
	 * 
	 * @type {number}
	 */
	static UNPRESSED = 0.0;
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
	 * 
	 * @type {object}
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
	 * 
	 * @type {object}
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
	 * 
	 * @type {object}
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
	/**
	 * Object full of the currently held down buttons
	 * 
	 * @type {object}
	 */
	pressed = (() => {
		const buttonMap = { ...Controller.BUTTONS_MAP };
		for (const key in buttonMap) {
			buttonMap[key] = false;
		}
		return buttonMap;
	})()
	/**
	 * Info about the controller
	 * 
	 * @type {object}
	 */
	info = {
		axes: null,
		buttons: null,
		previousButtonState: [],
		previousAxesState: [],
		initialAxesStickDrift: []
	}
	/**
	 * The left analogs position
	 */
	leftAnalogPos = { x: 0, y: 0 };
	/**
	 * The right analogs position
	 */
	rightAnalogPos = { x: 0, y: 0 };
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
	 * Returns the type the controller is. PC / PS / Xbox / Android
	 * 
	 * @returns {string}
	 */
	getType() {
		return this.type;
	}
	/**
	 * Update the state of this controller with the latest polled information
	 * 
	 * @param {Gamepad} - The gamepad with the new updated state
	 * @param {Controller} - The gamepad controller instance
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
			this.handleButtonInput(i, buttonValue, buttonStillHeld, newButtonState[i].pressed);
			this.info.previousButtonState[i] = newButtonState[i].pressed;
		}

		// Loop through the axis and check for changes
		/**
		 * Changes will almost always occur, so to prevent this spammy behavior we check in ranges. This range can be tweaked 0.0 is default
		 */
		/**
		 * @todo Stop using a for loop and check the axis manually, it is only 4. Two for left, and two for right, no loop is needed and will allow less events to be called due to it manually being checked than looped 4 times when their is 
		 * really only two axis. 2x the events are being checked for and called.
		 */
		for (let i = 0; i < newAxesState.length; i++) {
			// Check and see if the axis value changed significantly, we can tweak this value or maybe set it to a user defined value?
			// We also check if this value is set, if not we allow it to be set with the current data
			// The current axis
			let currentAxis = newAxesState[i];
			// IF the analog crosses this range, then it has been "dropped".
			if (currentAxis >= -Controller.ANALOG_RELEASE_RANGE && currentAxis <= Controller.ANALOG_RELEASE_RANGE && (currentAxis === this.info.previousAxesState[i]) && (currentAxis !== 0 && currentAxis !== -0)) {
				this.info.previousAxesState[i] = undefined;
				this.info.initialAxesStickDrift[i] = undefined;

				switch (Controller.AXES_REVERSED_MAP[i]) {
					case 'LEFT_X':
					case 'LEFT_Y':
						if (this.leftAnalogHeld) {
							this.leftAnalogHeld = false;
							this.handleDropAnalog('LEFT');
						}
						break;

					case 'RIGHT_X':
					case 'RIGHT_Y':
						if (this.rightAnalogHeld) {
							this.rightAnalogHeld = false;
							this.handleDropAnalog('RIGHT');
						}
						break;
				}
			}
			// Check if this axis has been held for more than one tick. And only if the axis is not 0. An axis of 0 means the analog is not being moved at all.
			const axisStillHeld = (this.info.initialAxesStickDrift[i] !== currentAxis) && (currentAxis === this.info.previousAxesState[i]) && (currentAxis !== 0 && currentAxis !== -0);
			const hasPreviousState = this.info.previousAxesState[i] !== undefined;
			// Can only calculate this if there was a previousAxesState
			let axisUpdateRangeMet = false;
			// If the axis is different then the initial stick drift of the analog
			const axisDifferentFromInitialStickDrift = (this.info.initialAxesStickDrift[i] !== undefined) && currentAxis !== this.info.initialAxesStickDrift[i];
			// If there is a previous state then we calculate if the range the analog has moved is enough to consider it an update
			if (hasPreviousState) {
				axisUpdateRangeMet = Math.abs(currentAxis - this.info.previousAxesState[i]) >= Controller.AXIS_UPDATE_RANGE;
			// If there is no previous state then this must mean the user has never touched the analog and we need to store the initial "stick drift" of this analog to check against in the future ticks to prevent non user axis changes from being called.
			} else {
				// In the event the analog had no previous state but the new axis is different then the stored initial stick drift then the analog has been moved
				if (axisDifferentFromInitialStickDrift) {
					axisUpdateRangeMet = Math.abs(currentAxis - this.info.initialAxesStickDrift[i]) >= Controller.AXIS_UPDATE_RANGE;
				// Otherwise store the initial axis stick drift
				} else {
					this.info.initialAxesStickDrift[i] = currentAxis;
				}
			}

			// If the axis is not the same as the initial stick drift then it means the user has touched the analog
			if (axisDifferentFromInitialStickDrift) {
				/**
				 * @todo Simplify into a function call because this code is repeated.
				 */
				axisUpdateRangeMet = Math.abs(currentAxis - this.info.initialAxesStickDrift[i]) >= Controller.AXIS_UPDATE_RANGE;
			}

			// If there is user input then handle events
			if (axisStillHeld || axisUpdateRangeMet) {
				switch (Controller.AXES_REVERSED_MAP[i]) {
					case 'LEFT_X':
					case 'LEFT_Y':
						if (!this.leftAnalogHeld && !hasPreviousState) {
							this.leftAnalogHeld = true;
							this.handleGrabAnalog('LEFT');
						}
						break;

					case 'RIGHT_X':
					case 'RIGHT_Y':
						if (!this.rightAnalogHeld && !hasPreviousState) {
							this.rightAnalogHeld = true;
							this.handleGrabAnalog('RIGHT');
						}
						break;
				}

				this.handleAxisInput(i, currentAxis, axisStillHeld);
				this.info.previousAxesState[i] = currentAxis;
			}
		}
	}
	/**
	 * Gets the current buttons pressed down on the gamepad.
	 */
	getPressed() {
		const buttonsDown = [];
		for (const button in this.pressed) {
			// If this button is currently pressed down add it to the array to return.
			if (this.pressed[button]) {
				buttonsDown.push(button);
			}
		}
		return buttonsDown;
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
					case 'grab':
					case 'drop':
						this.axisHandlers[pEvent] = pCallback;
						break;
					default:
						GamepadManager.logger.prefix('Gamepad-Module').error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				GamepadManager.logger.prefix('Gamepad-Module').error(`The callback for event "${pEvent}" is not a function.`);
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
					case 'grab':
					case 'drop':
						this.axisHandlers[pEvent] = null;
						break;
					default:
						GamepadManager.logger.prefix('Gamepad-Module').error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				GamepadManager.logger.prefix('Gamepad-Module').error(`The callback for event "${pEvent}" is not a function.`);
			}
		}
		return this;
	}
	/**
	 * Handles the input on the buttons.
	 * 
	 * @param {number} pButton - The button index that was pressed
	 * @param {number} pValue - The value of the button (0 for unpressed, 1 for pressed) 0-1 for buttons that have a range
	 * @param {boolean} pRepeat - Whether this button is still being held from a previous frame
	 * @param {boolean} pPressed - Whether this button is being pressed in this current frame.
	 */
	handleButtonInput(pButton, pValue, pRepeat, pPressed) {
		let buttonName = pButton;
		let clampedValue = Math.floor(pValue * 100) / 100;

		// Check if button is mapped
		for (const button in this.config.buttons) {
			if (this.config.buttons[button] === pButton) {
				buttonName = button;
				// Only set the value to pressed if it actually is pressed, don't set it to false via pPressed, as it will be set to false after the release event is called
				// We also check if the value is greater or equal to the triggers pressed value. This is due to a trigger not being considered to be pressed unless its passed or at this threshold.
				if (pPressed || clampedValue > Controller.UNPRESSED) this.pressed[buttonName] = true;
				break;
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
			// Press
			if (clampedValue <= Controller.PRESSED && clampedValue > Controller.UNPRESSED) {
				if (typeof(this.pressHandlers['press']) === 'function') this.pressHandlers['press'](buttonName, clampedValue, pRepeat);
			// Release
			} else if (clampedValue === Controller.UNPRESSED && (buttonName === 'LT' || buttonName === 'RT') && this.pressed[buttonName]) {
				if (typeof(this.releaseHandlers['release']) === 'function') this.releaseHandlers['release'](buttonName, clampedValue);
				this.pressed[buttonName] = false;
			// Release
			} else if (clampedValue === Controller.UNPRESSED && this.pressed[buttonName]) {
				if (typeof(this.releaseHandlers['release']) === 'function') this.releaseHandlers['release'](buttonName, clampedValue);
				this.pressed[buttonName] = false;
			}
		}
	}
	/**
	 * Handles the input on the analogs.
	 * 
	 * @param {number} pAxis - The axis index that was moved
	 * @param {number} pValue - The value of the axis that was moved (0-1 range)
	 * @param {boolean} pRepeat - Whether this axes is still the same from a previous frame
	 */
	handleAxisInput(pAxis, pValue, pRepeat) {
		let axisName = pAxis;
		// Clamp value to hundreths position just for easier calculations
		let clampedValue = Math.floor(pValue * 100) / 100;
		// Check if axis is mapped
		for (const axes in Controller.AXES) {
			if (Controller.AXES[axes] === pAxis) {
				axisName = axes;
			}
		}

		// The angle the axis is in
		let analogAngle = 0;
	
		if (axisName === 'LEFT_X' || axisName === 'LEFT_Y') {
			if (axisName === 'LEFT_X') {
				this.leftAnalogPos.x = clampedValue;
			}
			if (axisName === 'LEFT_Y') {
				this.leftAnalogPos.y = clampedValue;
			}
			analogAngle = GamepadManager.constructor.getAngle(Controller.baseAnalogPos, this.leftAnalogPos);
		}
		
		if (axisName === 'RIGHT_X' || axisName === 'RIGHT_Y') {
			if (axisName === 'RIGHT_X') {
				this.rightAnalogPos.x = clampedValue;
			}
			if (axisName === 'RIGHT_Y') {
				this.rightAnalogPos.y = clampedValue;
			}
			analogAngle = GamepadManager.constructor.getAngle(Controller.baseAnalogPos, this.rightAnalogPos);
		}

		if (axisName) {
			if (typeof(this.axisHandlers['axis']) === 'function') this.axisHandlers['axis'](axisName, clampedValue, analogAngle, pRepeat);
		}
	}
	/**
	 * Handles the event for when a analog is grabbed.
	 * 
	 * @param {string} pAnalog - Analog that was grabbed
	 */
	handleGrabAnalog(pAnalog) {
		if (pAnalog) {
			if (typeof(this.axisHandlers['grab']) === 'function') this.axisHandlers['grab'](pAnalog);
		}
	}
	/**
	 * Handles the event for when a analog is dropped.
	 * 
	 * @param {string} pAnalog - Analog that was dropped
	 */
	handleDropAnalog(pAnalog) {
		if (pAnalog) {
			if (typeof(this.axisHandlers['drop']) === 'function') this.axisHandlers['drop'](pAnalog);
		}
	}
	/**
	 * Whether the left analog is being held
	 * 
	 * @returns {boolean}
	 */
	isLeftAnalogHeld() {
		return this.leftAnalogHeld;
	}
	/**
	 * Whether the right analog is being held
	 * 
	 * @returns {boolean}
	 */
	isRightAnalogHeld() {
		return this.rightAnalogHeld;
	}
	/**
	 * Checks whether a button is pressed down or not
	 * 
	 * @param {string} pButtonName - The button to check if its pressed
	 * @returns {boolean}
	 */
	isButtonPressed(pButtonName) {
		return this.pressed[pButtonName];
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

export { Controller };
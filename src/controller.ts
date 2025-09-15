import { GamepadManager } from './gamepad';

class Controller {
	/**
	 * Configuration of which buttons / analogs map to which indexes
	 */
	config: {
		buttons: { [key: string]: number };
	} = {
		// Buttons
		buttons: (() => { return { ...Controller.BUTTONS_MAP }})()
	}
	/**
	 * Whether the left analog is currently being held
	 */
	leftAnalogHeld: boolean = false;
	/**
	 * Whether the right analog is currently being held
	 */
	rightAnalogHeld: boolean = false;
	/**
	 * The base analogs position when it is not in use
	 */
	static baseAnalogPos: { x: number; y: number } = { x: 0, y: 0 };
	/**
	 * Analog thumb sticks
	 */
	static AXES: { [key: string]: number } = {
		'LEFT_X': 0, // Left axis
		'LEFT_Y': 1, // Left axis 
		'RIGHT_X': 2,
		'RIGHT_Y': 3,
	}

	static AXES_REVERSED_MAP: { [key: number]: string } = (() => { 
		const reversedMap: { [key: number]: string } = {};
		for (const axis in Controller.AXES) {
			const index = Controller.AXES[axis];
			reversedMap[index] = axis;
		}
		return reversedMap;
	})()
	/**
	 * The range at which axis changes are detected
	 */
	static AXIS_UPDATE_RANGE: number = 0.0; // 0.2
	/**
	 * The range at which the analog is considered to be dropped -0.09 - 0.09
	 */
	static ANALOG_RELEASE_RANGE: number = 0.09;
	/**
	 * The value at which holding a trigger (LT OR RT) will consider it being pressed
	 */
	static TRIGGER_PRESSED_VALUE: number = 0.12;
	/**
	 * Value to indicate a pressed button
	 */
	static PRESSED: number = 1.0;
	/**
	 * Value to indicate a button is not pressed
	 */
	static UNPRESSED: number = 0.0;
	/**
	 * A button map that maps common button names to the indexes the computer knows them as
	 */
	static BUTTONS_MAP: { [key: string]: number } = {
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
	static BUTTONS_REVERSE_MAP: { [key: number]: string } = (() => { 
		const reversedMap: { [key: number]: string } = {};
		for (const button in Controller.BUTTONS_MAP) {
			const index = Controller.BUTTONS_MAP[button];
			reversedMap[index] = button;
		}
		return reversedMap;
	})()
	/**
	 * A small remapped version of the controllers button_map with PS4 alternatives
	 */
	static PS4_REMAPPED: { [key: string]: string } = {
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
	static GAMEPAD_IDS: { [key: string]: string } = {
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
	 */
	pressed: { [key: string]: boolean } = (() => {
		const buttonMap: { [key: string]: boolean } = {};
		for (const key in Controller.BUTTONS_MAP) {
			buttonMap[key] = false;
		}
		return buttonMap;
	})()
	/**
	 * Info about the controller
	 */
	info: {
		axes: readonly number[] | null;
		buttons: readonly GamepadButton[] | null;
		previousButtonState: boolean[];
		previousAxesState: (number | undefined)[];
		initialAxesStickDrift: (number | undefined)[];
	} = {
		axes: null,
		buttons: null,
		previousButtonState: [],
		previousAxesState: [],
		initialAxesStickDrift: []
	}
	/**
	 * The left analogs position
	 */
	leftAnalogPos: { x: number; y: number } = { x: 0, y: 0 };
	/**
	 * The right analogs position
	 */
	rightAnalogPos: { x: number; y: number } = { x: 0, y: 0 };
	/**
	 * Object of stored callback that will call when a button is pressed
	 */
	pressHandlers: { [key: string]: ((buttonName: string, value: number, repeat: boolean) => void) | null } = {};
	/**
	 * Object of stored callback that will call when a button is released
	 */
	releaseHandlers: { [key: string]: ((buttonName: string, value: number) => void) | null } = {};
	/**
	 * Object of stored callbacks that will call when the axis is changed
	 */
	axisHandlers: { [key: string]: ((analog: string) => void) | ((axisName: string, value: number, angle: number, repeat: boolean) => void) | null } = {};
	/**
	 * The timestamp of the gamepad.
	 */
	timestamp: number = 0;
	/**
	 * The index of the controller.
	 */
	index: number = 0;
	/**
	 * The gamepad object
	 */
	gamepad: Gamepad;
	/**
	 * The type of controller
	 */
	type: string;
	
	/**
	 * Creates a new controller instance and passes the gamepad it will be created with
	 * 
	 * @param pGamepad - A gamepad object
	 */
	constructor(pGamepad: Gamepad) {
		this.gamepad = pGamepad;
		this.timestamp = pGamepad.timestamp;
		this.index = pGamepad.index;
		this.type = Controller.GAMEPAD_IDS[this.gamepad.id] ? Controller.GAMEPAD_IDS[this.gamepad.id] : 'Generic';
	}
	/**
	 * Returns the type the controller is. PC / PS / Xbox / Android
	 * 
	 * @returns The controller type
	 */
	getType(): string {
		return this.type;
	}
	/**
	 * Update the state of this controller with the latest polled information
	 * 
	 * @param pGamepad - The gamepad with the new updated state
	 */
	updateState(pGamepad: Gamepad): void {
		const { buttons: newButtonState, axes: newAxesState, timestamp } = pGamepad;

		// Update the controllers info with the latest state (not the gamepad, as those are read only vars)
		this.info.buttons = newButtonState;
		this.info.axes = newAxesState;
		this.timestamp = timestamp;

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
				axisUpdateRangeMet = Math.abs(currentAxis - this.info.previousAxesState[i]!) >= Controller.AXIS_UPDATE_RANGE;
			// If there is no previous state then this must mean the user has never touched the analog and we need to store the initial "stick drift" of this analog to check against in the future ticks to prevent non user axis changes from being called.
			} else {
				// In the event the analog had no previous state but the new axis is different then the stored initial stick drift then the analog has been moved
				if (axisDifferentFromInitialStickDrift) {
					axisUpdateRangeMet = Math.abs(currentAxis - this.info.initialAxesStickDrift[i]!) >= Controller.AXIS_UPDATE_RANGE;
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
				axisUpdateRangeMet = Math.abs(currentAxis - this.info.initialAxesStickDrift[i]!) >= Controller.AXIS_UPDATE_RANGE;
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
	getPressed(): string[] {
		const buttonsDown: string[] = [];
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
     * @param pEvent - The event to attach the callback to
     * @param pCallback - The function to be called when the event is triggered
     * @return The Controller instance
     */
	on(pEvent: string, pCallback: ((buttonName: string, value: number, repeat: boolean) => void) | ((buttonName: string, value: number) => void) | ((analog: string) => void) | ((axisName: string, value: number, angle: number, repeat: boolean) => void)): Controller {
		if (typeof(pEvent) === 'string') {
			if (typeof(pCallback) === 'function') {
				switch (pEvent) {
					case 'press':
						this.pressHandlers[pEvent] = pCallback as (buttonName: string, value: number, repeat: boolean) => void;
						break;
					case 'release':
						this.releaseHandlers[pEvent] = pCallback as (buttonName: string, value: number) => void;
						break;
					case 'axis':
					case 'grab':
					case 'drop':
						this.axisHandlers[pEvent] = pCallback as ((analog: string) => void) | ((axisName: string, value: number, angle: number, repeat: boolean) => void);
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
     * @param pEvent - The event to remove the callback from
     * @return The Controller instance
     */	
	off(pEvent: string): Controller {
		if (typeof(pEvent) === 'string') {
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
		}
		return this;
	}
	/**
	 * Handles the input on the buttons.
	 * 
	 * @param pButton - The button index that was pressed
	 * @param pValue - The value of the button (0 for unpressed, 1 for pressed) 0-1 for buttons that have a range
	 * @param pRepeat - Whether this button is still being held from a previous frame
	 * @param pPressed - Whether this button is being pressed in this current frame.
	 */
	handleButtonInput(pButton: number, pValue: number, pRepeat: boolean, pPressed: boolean): void {
		let buttonName: string | number = pButton;
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
				buttonName = Controller.PS4_REMAPPED[buttonName as string];
			}
		}

		if (buttonName) {
			// Press
			if (clampedValue <= Controller.PRESSED && clampedValue > Controller.UNPRESSED) {
				if (typeof(this.pressHandlers['press']) === 'function') this.pressHandlers['press']!(buttonName as string, clampedValue, pRepeat);
			// Release
			} else if (clampedValue === Controller.UNPRESSED && (buttonName === 'LT' || buttonName === 'RT') && this.pressed[buttonName as string]) {
				if (typeof(this.releaseHandlers['release']) === 'function') this.releaseHandlers['release']!(buttonName as string, clampedValue);
				this.pressed[buttonName as string] = false;
			// Release
			} else if (clampedValue === Controller.UNPRESSED && this.pressed[buttonName as string]) {
				if (typeof(this.releaseHandlers['release']) === 'function') this.releaseHandlers['release']!(buttonName as string, clampedValue);
				this.pressed[buttonName as string] = false;
			}
		}
	}
	/**
	 * Handles the input on the analogs.
	 * 
	 * @param pAxis - The axis index that was moved
	 * @param pValue - The value of the axis that was moved (0-1 range)
	 * @param pRepeat - Whether this axes is still the same from a previous frame
	 */
	handleAxisInput(pAxis: number, pValue: number, pRepeat: boolean): void {
		let axisName: string | number = pAxis;
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
			analogAngle = (GamepadManager.constructor as any).getAngle(Controller.baseAnalogPos, this.leftAnalogPos);
		}
		
		if (axisName === 'RIGHT_X' || axisName === 'RIGHT_Y') {
			if (axisName === 'RIGHT_X') {
				this.rightAnalogPos.x = clampedValue;
			}
			if (axisName === 'RIGHT_Y') {
				this.rightAnalogPos.y = clampedValue;
			}
			analogAngle = (GamepadManager.constructor as any).getAngle(Controller.baseAnalogPos, this.rightAnalogPos);
		}

		if (axisName) {
			if (typeof(this.axisHandlers['axis']) === 'function') (this.axisHandlers['axis'] as (axisName: string, value: number, angle: number, repeat: boolean) => void)(axisName as string, clampedValue, analogAngle, pRepeat);
		}
	}
	/**
	 * Handles the event for when a analog is grabbed.
	 * 
	 * @param pAnalog - Analog that was grabbed
	 */
	handleGrabAnalog(pAnalog: string): void {
		if (pAnalog) {
			if (typeof(this.axisHandlers['grab']) === 'function') (this.axisHandlers['grab'] as (analog: string) => void)(pAnalog);
		}
	}
	/**
	 * Handles the event for when a analog is dropped.
	 * 
	 * @param pAnalog - Analog that was dropped
	 */
	handleDropAnalog(pAnalog: string): void {
		if (pAnalog) {
			if (typeof(this.axisHandlers['drop']) === 'function') (this.axisHandlers['drop'] as (analog: string) => void)(pAnalog);
		}
	}
	/**
	 * Whether the left analog is being held
	 * 
	 * @returns True if left analog is held
	 */
	isLeftAnalogHeld(): boolean {
		return this.leftAnalogHeld;
	}
	/**
	 * Whether the right analog is being held
	 * 
	 * @returns True if right analog is held
	 */
	isRightAnalogHeld(): boolean {
		return this.rightAnalogHeld;
	}
	/**
	 * Checks whether a button is pressed down or not
	 * 
	 * @param pButtonName - The button to check if its pressed
	 * @returns True if button is pressed
	 */
	isButtonPressed(pButtonName: string): boolean {
		return this.pressed[pButtonName];
	}
	/**
	 * Vibrate the controller (experimental)
	 * 
	 * dual-rumble: Dual-rumble describes a haptic configuration with an eccentric rotating mass vibration motor in each handle of a standard gamepad. 
	 * In this configuration, either motor is capable of vibrating the whole gamepad. 
	 * The two masses are unequal so that the effects of each can be combined to create more complex haptic effects.
	 * 
	 * @param pVibrationType - The type of rumble. "dual-rumble", or "vibration"
	 * @param pStartDelay - The start delay before the vibration occurs in ms
	 * @param pDuration - The duration of the vibration in ms
	 * @param pWeakMagnitude - The magnitude of the weak actuator (between 0 and 1).
	 * @param pStrongMagnitude - The magnitude of the strong actuator (between 0 and 1).
	 */
	vibrate(pVibrationType: string = 'dual-rumble', pStartDelay: number = 0, pDuration: number = 1000, pWeakMagnitude: number = 1, pStrongMagnitude: number = 1): void {
		if (!('vibrationActuator' in this.gamepad)) {
			return;
		}
		// If a invalid pVibrationType is passed, default it
		if (pVibrationType !== 'dual-rumble' && pVibrationType !== 'vibration') pVibrationType = 'dual-rumble';
		// A new call to playEffect() overrides a previous ongoing call.
		(this.gamepad as any).vibrationActuator.playEffect(pVibrationType, {
			startDelay: pStartDelay,
			duration: pDuration,
			weakMagnitude: pWeakMagnitude,
			strongMagnitude: pStrongMagnitude,
		});
	}
	/**
	 * The pulse() method of the GamepadHapticActuator interface makes the hardware pulse at a certain intensity for a specified duration. (From MDN)
	 * 
	 * @param pValue - A double representing the intensity of the pulse. This can vary depending on the hardware type, but generally takes a value between 0.0 (no intensity) and 1.0 (full intensity).
	 * @param pDuration - A double representing the duration of the pulse, in milliseconds.
	 */
	pulse(pValue: number = 1, pDuration: number = 200): void {
		if (!('hapticActuators' in this.gamepad)) {
			return;
		}
		(this.gamepad as any).hapticActuators[0].pulse(pValue, pDuration);
	}
}

export { Controller };

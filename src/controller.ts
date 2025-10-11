import { GamepadManager } from './gamepad';

/**
 * Type definitions for the Gamepad Controller
 */

// Point/Position types
export type Point2D = { x: number; y: number };

// Analog stick position with metadata
export type AnalogPosition = { x: number; y: number; magnitude: number; angle: number };

// Button state with pressed status and value
export type ButtonState = { pressed: boolean; value: number };

// Button action types for the global button event
/**
 * Button action types for the global 'button' event
 * 
 * @typedef {Object} ButtonAction
 * @property {'pressed'} pressed - Button was just pressed (transition from not pressed to pressed)
 * @property {'held'} held - Button is being held down (continuous while pressed)
 * @property {'released'} released - Button was just released (transition from pressed to not pressed)
 */
export type ButtonAction = 'pressed' | 'held' | 'released';

// Button states map
export type ButtonStates = { [buttonName: string]: ButtonState };

// Analog states with left and right sticks
export type AnalogStates = {
	leftStick: AnalogPosition;
	rightStick: AnalogPosition;
};

// Complete controller state
export type ControllerState = {
	type: string;
	index: number;
	buttons: ButtonStates;
	analogs: AnalogStates;
	deadZones: {
		leftAnalog: number;
		rightAnalog: number;
	};
};

// Vibration pattern step
export type VibrationStep = {
	delay: number;
	duration: number;
	weak: number;
	strong: number;
};

// Vibration preset configuration
export type VibrationPreset = {
	duration: number;
	weak: number;
	strong: number;
};

// Event listener options
export type EventListenerOptions = {
	once?: boolean;
	priority?: number;
};

// Handler function types
export type ButtonPressHandler = (buttonName: string, value: number, repeat: boolean) => void;
export type ButtonReleaseHandler = (buttonName: string, value: number) => void;
export type AnalogHandler = (analog: string) => void;
export type AxisHandler = (axisName: string, value: number, angle: number, repeat: boolean) => void;

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
	static baseAnalogPos: Point2D = { x: 0, y: 0 };
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
	 * User-configurable dead zone threshold (0.0 - 1.0)
	 * Default is 0.0 (no dead zone) following industry standards.
	 * Developers should configure this based on their application needs.
	 * Typical pValues: 0.0 (none), 0.15 (light), 0.25 (medium)
	 */
	deadZone: number = 0.0;
	/**
	 * Separate dead zones for left and right analog sticks
	 */
	leftAnalogDeadZone: number = 0.0;
	rightAnalogDeadZone: number = 0.0;
	/**
	 * Stick drift compensation pValues per axis
	 */
	stickDriftCompensation: { [pAxisIndex: number]: number } = {};
	/**
	 * The pValue at which holding a trigger (LT OR RT) will consider it being pressed
	 */
	static TRIGGER_PRESSED_VALUE: number = 0.12;
	/**
	 * Vibration presets for common haptic effects
	 */
	static VIBRATION_PRESETS: { [key: string]: VibrationPreset } = {
		'light-tap': { duration: 50, weak: 0.3, strong: 0.3 },
		'medium-rumble': { duration: 200, weak: 0.6, strong: 0.6 },
		'heavy-shake': { duration: 400, weak: 1.0, strong: 1.0 },
		'notification': { duration: 100, weak: 0.5, strong: 0.2 },
		'damage': { duration: 150, weak: 0.8, strong: 1.0 },
	};
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
	 * Info about the controller
	 */
	info: {
		axes: readonly number[] | null;
		buttons: readonly GamepadButton[] | null;
		previousButtonState: boolean[];
		previousAxesState: number[];
		initialAxesStickDrift: number[];
	} = {
		axes: null,
		buttons: null,
		previousButtonState: [],
		previousAxesState: [],
		initialAxesStickDrift: []
	}
	/**
	 * Map of event listeners for multiple listeners per event
	 */
	private eventListeners: Map<string, Function[]> = new Map();
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
		this.type = this.detectControllerType();
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
	 * Applies circular dead zone filtering with proper scaling to an analog stick
	 * 
	 * @param pX - Raw X axis pValue (-1 to 1)
	 * @param pY - Raw Y axis pValue (-1 to 1)
	 * @param pDeadZone - Dead zone threshold (0.0 - 1.0)
	 * @returns Object with filtered x, y pValues and magnitude
	 */
	applyCircularDeadZone(pX: number, pY: number, pDeadZone: number): AnalogPosition {
		// Calculate magnitude from center
		const magnitude = Math.sqrt(pX * pX + pY * pY);
		
		// If within dead zone, return zero
		if (magnitude < pDeadZone) {
			return { x: 0, y: 0, magnitude: 0, angle: 0 };
		}
		
		// Scale the input to maintain full range after dead zone
		const scaledMagnitude = (magnitude - pDeadZone) / (1 - pDeadZone);
		
		// Normalize and scale
		const normalizedX = pX / magnitude;
		const normalizedY = pY / magnitude;
		
		const scaledX = normalizedX * scaledMagnitude;
		const scaledY = normalizedY * scaledMagnitude;
		
		// Calculate angle
		const angle = Math.atan2(scaledY, scaledX);
		
		return {
			x: scaledX,
			y: scaledY,
			magnitude: scaledMagnitude,
			angle: angle
		};
	}
	/**
	 * Applies dead zone filtering to an axis pValue (legacy method for individual axes)
	 * 
	 * @param pValue - Raw axis pValue (-1 to 1)
	 * @param pAxisIndex - Index of the axis
	 * @returns Filtered pValue (0 if within dead zone, otherwise compensated pValue)
	 */
	applyDeadZone(pValue: number, pAxisIndex: number): number {
		// Store initial stick drift if not set
		if (this.info.initialAxesStickDrift[pAxisIndex] === undefined) {
			this.info.initialAxesStickDrift[pAxisIndex] = pValue;
		}
		
		// Apply stick drift compensation
		const compensatedValue = pValue - this.info.initialAxesStickDrift[pAxisIndex];
		
		// Apply dead zone threshold
		if (Math.abs(compensatedValue) < this.deadZone) {
			return 0;
		}
		
		// Scale the pValue to maintain full range after dead zone
		const sign = Math.sign(compensatedValue);
		const scaledValue = (Math.abs(compensatedValue) - this.deadZone) / (1 - this.deadZone);
		return Math.max(-1, Math.min(1, sign * scaledValue));
	}
	/**
	 * Gets the current left analog stick position with metadata
	 * 
	 * @returns Object containing x, y, magnitude, and angle
	 */
	getLeftAnalogPosition(): AnalogPosition {
		// Return cached reactive state (no calculations needed)
		return this.currentAnalogStates.leftStick;
	}
	/**
	 * Gets the current right analog stick position with metadata
	 * 
	 * @returns Object containing x, y, magnitude, and angle
	 */
	getRightAnalogPosition(): AnalogPosition {
		// Return cached reactive state (no calculations needed)
		return this.currentAnalogStates.rightStick;
	}
	/**
	 * Gets the angle between two points
	 * 
	 * @param pStartPoint - The starting point
	 * @param pEndPoint - The ending point
	 * @returns The angle between the starting point and the ending point
	 */
	private getAngle(pStartPoint: Point2D, pEndPoint: Point2D): number {
		const y = pStartPoint.y - pEndPoint.y;
		const x = pStartPoint.x - pEndPoint.x;
		return -Math.atan2(y, x) - Math.PI;
	}
	/**
	 * Update the state of this controller with the latest polled information
	 * 
	 * @param pGamepad - The gamepad with the new updated state
	 */
	updateState(pGamepad: Gamepad): void {
		const { buttons: pNewButtonState, axes: pNewAxesState, timestamp: pTimestamp } = pGamepad;

		// Update the controllers info with the latest state
		this.info.buttons = pNewButtonState;
		this.info.axes = pNewAxesState;
		this.timestamp = pTimestamp;

		// Update button states reactively
		this.updateButtonStates(pNewButtonState);
		
		// Update analog states reactively
		this.updateAnalogStates(pNewAxesState);
	}

	/**
	 * Updates button states reactively (Optimized - no object churn)
	 */
	private updateButtonStates(pButtons: readonly GamepadButton[]): void {
		Object.keys(Controller.BUTTONS_MAP).forEach(buttonName => {
			const buttonIndex = Controller.BUTTONS_MAP[buttonName];
			const button = pButtons[buttonIndex];
			
			if (button) {
				let actualButtonName = buttonName;
				let isPressed = false;
				let value = button.value;
				
				// Handle PlayStation button remapping
				if (this.type === 'PS' && ['A', 'B', 'X', 'Y'].includes(buttonName)) {
					if (buttonName === 'A') actualButtonName = 'CROSS';
					else if (buttonName === 'B') actualButtonName = 'CIRCLE';
					else if (buttonName === 'X') actualButtonName = 'SQUARE';
					else if (buttonName === 'Y') actualButtonName = 'TRIANGLE';
					
					isPressed = button.pressed;
				} else {
					try {
						isPressed = button.pressed;
					} catch (e) {
						isPressed = false;
					}
				}
				
				// Handle triggers as analog axes
				if (buttonName === 'LT' || buttonName === 'RT') {
					const triggerAxisIndex = buttonName === 'LT' ? 4 : 5;
					if (this.info.axes?.[triggerAxisIndex] !== undefined) {
						value = Math.abs(this.info.axes[triggerAxisIndex]);
						isPressed = value > 0.1;
					}
				}
				
				// Get or create cached state (reuse existing object)
				let currentState = this.currentButtonStates.get(buttonName);
				if (!currentState) {
					currentState = { pressed: false, value: 0 };
					this.currentButtonStates.set(buttonName, currentState);
				}
				
				// Only fire events if state changed (update in place to avoid object churn)
				if (currentState.pressed !== isPressed || Math.abs(currentState.value - value) > 0.01) {
					const wasPressed = currentState.pressed;
					currentState.pressed = isPressed;
					currentState.value = value;
					
					// Fire appropriate events
					if (isPressed && !wasPressed) {
						this.fireEvent('buttondown', buttonName, value);
					} else if (!isPressed && wasPressed) {
						this.fireEvent('buttonup', buttonName, value);
					}
					this.fireEvent('buttonpress', buttonName, value, wasPressed);
					
					// Fire global button event for all button changes
					let action: ButtonAction;
					if (isPressed && !wasPressed) {
						action = 'pressed';
					} else if (!isPressed && wasPressed) {
						action = 'released';
					} else {
						action = 'held';
					}
					this.fireEvent('button', buttonName, value, action);
				} else {
					// Update the cached state even if no events are fired
					currentState.pressed = isPressed;
					currentState.value = value;
				}
			}
		});
	}

	/**
	 * Updates analog states reactively (Optimized - no object churn)
	 */
	private updateAnalogStates(pAxes: readonly number[]): void {
		// Update left analog stick (reuse existing object)
		const leftRawX = pAxes[Controller.AXES.LEFT_X] || 0;
		const leftRawY = pAxes[Controller.AXES.LEFT_Y] || 0;
		const leftFiltered = this.applyCircularDeadZone(leftRawX, leftRawY, this.leftAnalogDeadZone);
		const leftAngle = this.getAngle(Controller.baseAnalogPos, { x: leftFiltered.x, y: leftFiltered.y });
		
		// Detect left analog grab/drop
		const leftMagnitude = leftFiltered.magnitude;
		const wasLeftHeld = this.leftAnalogHeld;
		const isLeftHeld = leftMagnitude > 0.1; // Threshold for "held"
		
		if (isLeftHeld !== wasLeftHeld) {
			this.leftAnalogHeld = isLeftHeld;
			if (isLeftHeld) {
				this.fireEvent('grab', 'LEFT');
			} else {
				this.fireEvent('drop', 'LEFT');
			}
		}
		
		// Only update if changed significantly (reuse existing object)
		const currentLeft = this.currentAnalogStates.leftStick;
		if (Math.abs(currentLeft.x - leftFiltered.x) > 0.01 || Math.abs(currentLeft.y - leftFiltered.y) > 0.01) {
			// Update in place to avoid object churn
			currentLeft.x = leftFiltered.x;
			currentLeft.y = leftFiltered.y;
			currentLeft.magnitude = leftFiltered.magnitude;
			currentLeft.angle = leftAngle;
			
			this.fireEvent('axischange', 'LEFT_X', leftFiltered.x, leftAngle, true);
			this.fireEvent('axischange', 'LEFT_Y', leftFiltered.y, leftAngle, true);
		}
		
		// Update right analog stick (reuse existing object)
		const rightRawX = pAxes[Controller.AXES.RIGHT_X] || 0;
		const rightRawY = pAxes[Controller.AXES.RIGHT_Y] || 0;
		const rightFiltered = this.applyCircularDeadZone(rightRawX, rightRawY, this.rightAnalogDeadZone);
		const rightAngle = this.getAngle(Controller.baseAnalogPos, { x: rightFiltered.x, y: rightFiltered.y });
		
		// Detect right analog grab/drop
		const rightMagnitude = rightFiltered.magnitude;
		const wasRightHeld = this.rightAnalogHeld;
		const isRightHeld = rightMagnitude > 0.1; // Threshold for "held"
		
		if (isRightHeld !== wasRightHeld) {
			this.rightAnalogHeld = isRightHeld;
			if (isRightHeld) {
				this.fireEvent('grab', 'RIGHT');
			} else {
				this.fireEvent('drop', 'RIGHT');
			}
		}
		
		// Only update if changed significantly (reuse existing object)
		const currentRight = this.currentAnalogStates.rightStick;
		if (Math.abs(currentRight.x - rightFiltered.x) > 0.01 || Math.abs(currentRight.y - rightFiltered.y) > 0.01) {
			// Update in place to avoid object churn
			currentRight.x = rightFiltered.x;
			currentRight.y = rightFiltered.y;
			currentRight.magnitude = rightFiltered.magnitude;
			currentRight.angle = rightAngle;
			
			this.fireEvent('axischange', 'RIGHT_X', rightFiltered.x, rightAngle, true);
			this.fireEvent('axischange', 'RIGHT_Y', rightFiltered.y, rightAngle, true);
		}
	}
	/**
	 * Detects controller type based on Web API properties
	 * 
	 * @returns Controller type string
	 */
	private detectControllerType(): string {
		const id = this.gamepad.id.toLowerCase();
		const mapping = this.gamepad.mapping;
		
		// Use standard mapping if available
		if (mapping === 'standard') {
			// Detect specific controller types from ID
			if (id.includes('xbox') || id.includes('microsoft')) {
				return 'Xbox';
			} else if (id.includes('playstation') || id.includes('sony') || id.includes('dualshock') || id.includes('dualsense')) {
				return 'PS';
			} else if (id.includes('nintendo') || id.includes('switch')) {
				return 'NS';
			} else if (id.includes('logitech')) {
				return 'PC';
			}
			return 'Standard';
		}
		
		// Fallback to generic for non-standard controllers
		return 'Generic';
	}

	/**
	 * Checks if this controller supports haptic feedback
	 * 
	 * @returns True if haptic feedback is supported
	 */
	hasHapticSupport(): boolean {
		return 'vibrationActuator' in this.gamepad || 'hapticActuators' in this.gamepad;
	}

	/**
	 * Checks if this controller supports motion sensors
	 * 
	 * @returns True if motion sensors are supported
	 */
	hasMotionSupport(): boolean {
		return 'pose' in this.gamepad;
	}

	/**
	 * Checks if this controller supports touchpad
	 * 
	 * @returns True if touchpad is supported
	 */
	hasTouchpadSupport(): boolean {
		// Check for PlayStation controllers with touchpad
		return this.type === 'PS' && this.gamepad.buttons.length >= 17; // Touchpad buttons
	}

	/**
	 * Gets the controller's display name
	 * 
	 * @returns Human-readable controller name
	 */
	getDisplayName(): string {
		const id = this.gamepad.id;
		const mapping = this.gamepad.mapping;
		
		// Use mapping if available (standard controllers)
		if (mapping === 'standard') {
			return `${this.type} Controller (Standard)`;
		}
		
		// Use ID for non-standard controllers
		return id || 'Unknown Controller';
	}

	/**
	 * Gets the current buttons pressed down on the gamepad.
	 */
	getPressed(): string[] {
		const buttonsDown: string[] = [];
		for (const [buttonName, buttonState] of this.currentButtonStates) {
			if (buttonState.pressed) {
				buttonsDown.push(buttonName);
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
	/**
	 * Adds an event listener with optional configuration
	 * 
	 * @param pEvent - The event name (case agnostic)
	 * @param pCallback - The callback function
	 * @param pOptions - Optional configuration (once, priority)
	 * @returns The Controller instance
	 */
	addEventListener(pEvent: string, pCallback: Function, pOptions?: EventListenerOptions): Controller {
		if (!pCallback) {
			GamepadManager.logger.prefix('Gamepad-Module').error(`The callback for event "${pEvent}" is not a function.`);
			return this;
		}
		
		// Convert to lowercase for case matching
		const lowerEvent = pEvent.toLowerCase();
		
		if (!this.eventListeners.has(lowerEvent)) {
			this.eventListeners.set(lowerEvent, []);
		}
		
		const listeners = this.eventListeners.get(lowerEvent)!;
		listeners.push(pCallback);
		
		// Sort by priority if specified
		if (pOptions?.priority !== undefined) {
			listeners.sort((a, b) => (a as any).priority - (b as any).priority);
		}
		
		return this;
	}
	/**
	 * Removes an event listener
	 * 
	 * @param pEvent - The event name (case agnostic)
	 * @param pCallback - The callback function to remove
	 * @returns The Controller instance
	 */
	removeEventListener(pEvent: string, pCallback: Function): Controller {
		// Convert to lowercase for case matching
		const lowerEvent = pEvent.toLowerCase();
		
		const listeners = this.eventListeners.get(lowerEvent);
		if (listeners) {
			const index = listeners.indexOf(pCallback);
			if (index !== -1) {
				listeners.splice(index, 1);
			}
		}
		return this;
	}
	/**
	 * Fires an event to all registered listeners
	 * 
	 * @param pEventName - The name of the event
	 * @param pArgs - Arguments to pass to the listeners
	 */
	private fireEvent(pEventName: string, ...pArgs: any[]): void {
		// Convert to lowercase for case matching
		const lowerEventName = pEventName.toLowerCase();
		
		const listeners = this.eventListeners.get(lowerEventName);
		if (listeners) {
			listeners.forEach(listener => {
				try {
					listener(...pArgs);
				} catch (error) {
					GamepadManager.logger.prefix('Gamepad-Module').error(`Error in event listener for "${pEventName}":`, error);
				}
			});
		}
	}
	/**
	 * Sets the dead zone threshold for this controller
	 * 
	 * Dead zones ignore small analog stick movements to prevent drift and unwanted input.
	 * Values below the threshold are treated as 0. Higher values = more input ignored.
	 * 
	 * @param pDeadZone - The dead zone threshold (0.0 to 1.0, where 0.15 = 15% dead zone)
	 * @throws Error if deadZone is not between 0 and 1
	 */
	setDeadZone(pDeadZone: number): void {
		if (pDeadZone < 0 || pDeadZone > 1) {
			throw new Error('Dead zone must be between 0 and 1');
		}
		this.deadZone = pDeadZone;
	}
	/**
	 * Sets the dead zone threshold for the left analog stick
	 * 
	 * Dead zones ignore small analog stick movements to prevent drift and unwanted input.
	 * Values below the threshold are treated as 0. Higher values = more input ignored.
	 * 
	 * @param pDeadZone - The dead zone threshold (0.0 to 1.0, where 0.15 = 15% dead zone)
	 * @throws Error if deadZone is not between 0 and 1
	 */
	setLeftAnalogDeadZone(pDeadZone: number): void {
		if (pDeadZone < 0 || pDeadZone > 1) {
			throw new Error('Dead zone must be between 0 and 1');
		}
		this.leftAnalogDeadZone = pDeadZone;
	}
	/**
	 * Sets the dead zone threshold for the right analog stick
	 * 
	 * Dead zones ignore small analog stick movements to prevent drift and unwanted input.
	 * Values below the threshold are treated as 0. Higher values = more input ignored.
	 * 
	 * @param pDeadZone - The dead zone threshold (0.0 to 1.0, where 0.15 = 15% dead zone)
	 * @throws Error if deadZone is not between 0 and 1
	 */
	setRightAnalogDeadZone(pDeadZone: number): void {
		if (pDeadZone < 0 || pDeadZone > 1) {
			throw new Error('Dead zone must be between 0 and 1');
		}
		this.rightAnalogDeadZone = pDeadZone;
	}
	/**
	 * Gets the current dead zone threshold
	 * 
	 * @returns The current dead zone pValue
	 */
	getDeadZone(): number {
		return this.deadZone;
	}
	/**
	 * Gets the current left analog dead zone threshold
	 * 
	 * @returns The current left analog dead zone pValue
	 */
	getLeftAnalogDeadZone(): number {
		return this.leftAnalogDeadZone;
	}
	/**
	 * Gets the current right analog dead zone threshold
	 * 
	 * @returns The current right analog dead zone pValue
	 */
	getRightAnalogDeadZone(): number {
		return this.rightAnalogDeadZone;
	}
	/**
	 * Current button states (reactive state)
	 */
	private currentButtonStates: Map<string, ButtonState> = new Map();
	
	/**
	 * Current analog states (reactive state)
	 */
	private currentAnalogStates: AnalogStates = {
		leftStick: { x: 0, y: 0, magnitude: 0, angle: 0 },
		rightStick: { x: 0, y: 0, magnitude: 0, angle: 0 }
	};

	/**
	 * Gets the current state of all buttons (cached for performance - no object churn)
	 * 
	 * @returns Object with button states and pValues (reuses existing objects)
	 */
	getButtonStates(): ButtonStates {
		// Return reference to existing Map (no object churn)
		return this.currentButtonStates as any;
	}
	/**
	 * Gets the current state of all analog inputs (cached for performance - no object churn)
	 * 
	 * @returns Object with analog stick states (reuses existing objects)
	 */
	getAnalogStates(): AnalogStates {
		// Return reference to existing objects (no object churn)
		return this.currentAnalogStates;
	}
	/**
	 * Gets the complete controller state (optimized - no object churn)
	 * 
	 * @returns Object with all controller state information (reuses existing objects)
	 */
	getState(): ControllerState {
		// Return references to existing objects (no object churn)
		return {
			type: this.type,
			index: this.index,
			buttons: this.currentButtonStates as any,
			analogs: this.currentAnalogStates,
			deadZones: {
				leftAnalog: this.leftAnalogDeadZone,
				rightAnalog: this.rightAnalogDeadZone
			}
		};
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
	 * @param pButtonName - The button to check if its pressed (case agnostic)
	 * @returns True if button is pressed
	 * @throws Error if buttonName is not a valid button
	 */
	isButtonPressed(pButtonName: string): boolean {
		if (!pButtonName) {
			throw new Error('Button name must be a non-empty string');
		}
		
		// Convert to uppercase for case-insensitive matching
		const upperButtonName = pButtonName.toUpperCase();
		
		// Check if it's a valid button name
		const validButtons = Object.keys(Controller.BUTTONS_MAP);
		if (!validButtons.includes(upperButtonName)) {
			throw new Error(`Invalid button name: ${pButtonName}. Valid buttons: ${validButtons.join(', ')}`);
		}
		
		// Use modern state system
		const buttonState = this.currentButtonStates.get(upperButtonName);
		return buttonState ? buttonState.pressed : false;
	}
	/**
	 * Vibrates the controller using a preset pattern
	 * 
	 * @param pPreset - The preset name from VIBRATION_PRESETS (case agnostic)
	 * @param pStartDelay - Optional start delay in ms
	 * @returns Promise that resolves when vibration completes
	 */
	vibratePreset(pPreset: keyof typeof Controller.VIBRATION_PRESETS, pStartDelay: number = 0): Promise<void> {
		// Convert to lowercase for case matching
		const lowerPreset = String(pPreset).toLowerCase() as keyof typeof Controller.VIBRATION_PRESETS;
		const presetConfig = Controller.VIBRATION_PRESETS[lowerPreset];
		
		if (!presetConfig) {
			throw new Error(`Invalid vibration preset: ${pPreset}. Valid presets: ${Object.keys(Controller.VIBRATION_PRESETS).join(', ')}`);
		}
		
		return this.vibrate('dual-rumble', pStartDelay, presetConfig.duration, presetConfig.weak, presetConfig.strong);
	}
	/**
	 * Vibrates the controller with a sequence of patterns
	 * 
	 * @param pPattern - Array of vibration patterns
	 * @returns Promise that resolves when all vibrations complete
	 */
	async vibratePattern(pPattern: VibrationStep[]): Promise<void> {
		for (const step of pPattern) {
			await this.vibrate('dual-rumble', step.delay, step.duration, step.weak, step.strong);
		}
	}
	/**
	 * Stops all ongoing vibrations
	 */
	stopVibration(): void {
		if (!this.hasHapticSupport()) {
			GamepadManager.logger.prefix('Gamepad-Module').warn('Controller does not support vibration');
			return;
		}

		// Try new hapticActuators API first
		if ('hapticActuators' in this.gamepad) {
			const actuators = (this.gamepad as any).hapticActuators;
			if (actuators && actuators.length > 0) {
				actuators.forEach((actuator: any) => actuator.reset());
				return;
			}
		}

		// Fallback to old vibrationActuator API
		if ('vibrationActuator' in this.gamepad) {
			(this.gamepad as any).vibrationActuator.reset();
		}
	}
	/**
	 * Vibrate the controller with validation and Promise support
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
	 * @returns Promise that resolves when vibration completes
	 */
	vibrate(pVibrationType: string = 'dual-rumble', pStartDelay: number = 0, pDuration: number = 1000, pWeakMagnitude: number = 1, pStrongMagnitude: number = 1): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!('vibrationActuator' in this.gamepad)) {
				reject(new Error('Vibration not supported on this controller'));
				return;
			}
			
			// Validate parameters
			if (pVibrationType !== 'dual-rumble' && pVibrationType !== 'vibration') {
				pVibrationType = 'dual-rumble';
			}
			
			// Clamp magnitudes to valid range
			pWeakMagnitude = Math.max(0, Math.min(1, pWeakMagnitude));
			pStrongMagnitude = Math.max(0, Math.min(1, pStrongMagnitude));
			
			// Validate duration
			if (pDuration <= 0) {
				reject(new Error('Duration must be greater than 0'));
				return;
			}
				
			try {
				// A new call to playEffect() overrides a previous ongoing call.
				(this.gamepad as any).vibrationActuator.playEffect(pVibrationType, {
							startDelay: Math.max(0, pStartDelay),
					duration: pDuration,
					weakMagnitude: pWeakMagnitude,
					strongMagnitude: pStrongMagnitude,
				});
						
				// Resolve after duration + start delay
				setTimeout(() => resolve(), pStartDelay + pDuration);
			} catch (error) {
				reject(error);
			}
		});
	}
}

export { Controller };

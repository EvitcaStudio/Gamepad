
import { Controller } from './controller.mjs';
import { Logger } from './vendor/logger.min.mjs';

/**
 * A gamepadmanager to help with games / handling input from a controller
 * @class GamepadManagerSingleton
 * @license GamepadManager does not have a license at this time. For licensing contact the author
 * @author https://github.com/doubleactii
 * @todo Currently bluetooth gamepads when disconnecting (PS4 only) do no fire a disconnected event. Manually calling `this.gamepad.vibrationActuator.reset()` can force it to call a disconnect event, but 
 * this is a messy way of checking each tick to see if the gamepad is still connected. It also will cancel ongoing vibrations. Find a fix. (This is a GamepadAPI issue/OS issue/not code wise issue)
 */
class GamepadManagerSingleton {
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
	 * Controllers connected before an event listener caught them.
	 * @type {Set<Controller> | null}
	 */
	connectedControllers = null;
	/**
	 * Controllers connected before an event listener caught them.
	 * @type {Set<Controller> | null}
	 */
	unassignedControllers = null;
	/**
	 * Object containing the callback for when a controller is disconnected
	 * 
	 * @type {Object}
	 */
	disconnectHandler = {};
	/**
	 * The version of the module.
	 */
	version = "VERSION_REPLACE_ME";
	/**
	 * Creates the instance and assigns event handlers to gamepad events
	 */
	constructor() {

        /** The logger module this module uses to log errors / logs.
         * @private
         * @type {Object}
         */
        this.logger = new Logger();
        this.logger.registerType('Gamepad-Module', '#ff6600');

		this.connectedControllers = new Set();
		this.unassignedControllers = new Set();

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
			this.logger.prefix('Gamepad-Module').warn('Gamepad API not supported in this browser.');
		}
	}
	/**
	 * Gets the angle between two points
	 * 
	 * @param {Object} pStartPoint - The starting point
	 * @param {Object} pEndPoint - The ending point
	 * @returns {number} The angle between the starting point and the ending point
	 */
	static getAngle(pStartPoint, pEndPoint) {
		const y = pStartPoint.y - pEndPoint.y;
		const x = pStartPoint.x - pEndPoint.x;
		return -Math.atan2(y, x) - Math.PI;
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
     * Attaches a callback to the specified event.
	 * 
     * @param {Object} pEvent - The event to attach the callback to
     * @param {Function} pCallback - The function to be called when the event is triggered
     * @return {GamepadManagerSingleton} The GamepadManagerSingleton instance
     */
	on(pEvent, pCallback) {
		if (typeof(pEvent) === 'string') {
			if (typeof(pCallback) === 'function') {
				switch (pEvent) {
					case 'connect':
						this.connectHandler[pEvent] = pCallback;
						this.unassignedControllers.forEach(pController => this.connectHandler[pEvent](pController));
						this.unassignedControllers.clear();
						break;

					case 'disconnect':
						this.disconnectHandler[pEvent] = pCallback;
						break;

					default:
						this.logger.prefix('Gamepad-Module').error(`The event "${pEvent}" is not supported.`);
				}
			} else {
				this.logger.prefix('Gamepad-Module').error(`The callback for event "${pEvent}" is not a function.`);
			}
		}
		return this;
	}
	/**
	 * Listener function for when a gamepad is connected
	 * 
	 * @param {pGamepadEvent} pGamepadEvent - A gamepad event
	 */
	handleGamepadConnected(pGamepadEvent) {
		// Create a controller from the gamepad that was connected
		// This controller only saves a snapshot of the data of when it was first created, but we update it based on new polled data
		const controller = new Controller(pGamepadEvent.gamepad);

		this.controllers[controller.index] = controller;
		this.connectedControllers.add(controller);
		
		if (typeof(this.connectHandler.connect) === 'function') {
			this.connectHandler.connect(controller);
		} else {
			this.unassignedControllers.add(controller);
		}
	}
	/**
	 * Listener function for when the gamepad is disconnected
	 * 
	 * @param {pGamepadEvent} pGamepadEvent - A gamepad event
	 */
	handleGamepadDisconnected(pGamepadEvent) {
		// Delete the controller when it's disconnected
		// Maybe add a option to save gamepad info for a short while, incase it disconnected due to battery? 
		// When reconnected it can prompt an alert that says "restore configuration for gamepad". This will restore that configuration to the controller.
		const index = pGamepadEvent.gamepad.index;
		const controller = this.controllers[index];

		if (typeof(this.disconnectHandler.disconnect) === 'function') this.disconnectHandler.disconnect(controller);

		this.connectedControllers.delete(controller);
		delete this.controllers[index];
	}
	/**
	 * Get the latest game state of the connected gamepads (Chrome only saves snapshots of the state, we have to keep polling to get updated states)
	 */
	pollGamepadState() {
		const gamepads = navigator.getGamepads();
		if (!gamepads) return;
		// Loop through all connected controllers and update their state
		for (const gamepad of gamepads) {
			// Can be null if disconnected during the session
			if (gamepad) {
				for (const controller in this.controllers) {
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


export const GamepadManager = new GamepadManagerSingleton();

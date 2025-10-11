import { Controller, Point2D } from './controller';
// @ts-ignore
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
	 * Object containing all connected controllers mapped by index
	 */
	private controllerMap: Map<number, Controller> = new Map();
	/**
	 * Array tracking the order controllers were connected
	 */
	private connectionOrder: number[] = [];
	/**
	 * Index of the main controller (null if none set)
	 */
	private mainControllerIndex: number | null = null;
	/**
	 * Object containing the callback for when a controller is connected
	 */
	connectHandler: { [key: string]: (controller: Controller) => void } = {};
	/**
	 * Controllers connected before an event listener caught them.
	 */
	connectedControllers: Set<Controller> | null = null;
	/**
	 * Controllers connected before an event listener caught them.
	 */
	unassignedControllers: Set<Controller> | null = null;
	/**
	 * Object containing the callback for when a controller is disconnected
	 */
	disconnectHandler: { [key: string]: (controller: Controller) => void } = {};
	/**
	 * The version of the module.
	 */
	version: string = "VERSION_REPLACE_ME";
	/**
	 * The logger module this module uses to log errors / logs.
	 */
	public logger: any;
	
	/**
	 * Creates the instance and assigns event handlers to gamepad events
	 */
	constructor() {
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
	 * @param pStartPoint - The starting point
	 * @param pEndPoint - The ending point
	 * @returns The angle between the starting point and the ending point
	 * @deprecated Use Controller.getAngle() instead
	 */
	static getAngle(pStartPoint: Point2D, pEndPoint: Point2D): number {
		const y = pStartPoint.y - pEndPoint.y;
		const x = pStartPoint.x - pEndPoint.x;
		return -Math.atan2(y, x) - Math.PI;
	}
	/**
	 * Sets the main controller by index
	 * 
	 * @param pIndex - The index of the controller to set as main
	 * @returns True if successfully set, false if controller not found
	 */
	setMainController(pIndex: number): boolean {
		if (this.controllerMap.has(pIndex)) {
			this.mainControllerIndex = pIndex;
			return true;
		}
		return false;
	}
	/**
	 * Gets the main controller
	 * 
	 * @returns The main controller or null if none set
	 */
	getMainController(): Controller | null {
		if (this.mainControllerIndex !== null) {
			return this.controllerMap.get(this.mainControllerIndex) || null;
		}
		// Default to first connected controller
		if (this.connectionOrder.length > 0) {
			return this.controllerMap.get(this.connectionOrder[0]) || null;
		}
		return null;
	}
	/**
	 * Gets a specific controller by index
	 * 
	 * @param pIndex - The index of the controller
	 * @returns The controller or null if not found
	 */
	getController(pIndex: number): Controller | null {
		return this.controllerMap.get(pIndex) || null;
	}
	/**
	 * Gets all connected controllers as an array
	 * 
	 * @returns Array of all connected controllers
	 */
	getControllers(): Controller[] {
		return Array.from(this.controllerMap.values());
	}
	/**
	 * Gets all controllers with metadata
	 * 
	 * @returns Array of controller objects with metadata
	 */
	getControllersWithMetadata(): Array<{controller: Controller, index: number, isMain: boolean, connectionOrder: number}> {
		return Array.from(this.controllerMap.entries()).map(([index, controller]) => ({
			controller,
			index,
			isMain: index === this.mainControllerIndex || (this.mainControllerIndex === null && index === this.connectionOrder[0]),
			connectionOrder: this.connectionOrder.indexOf(index)
		}));
	}
    /**
     * Attaches a callback to the specified event.
	 * 
     * @param pEvent - The event to attach the callback to
     * @param pCallback - The function to be called when the event is triggered
     * @return The GamepadManagerSingleton instance
     */
	on(pEvent: string, pCallback: (controller: Controller) => void): GamepadManagerSingleton {
		if (!pCallback) {
			this.logger.prefix('Gamepad-Module').error(`The callback for event "${pEvent}" is not a function.`);
			return this;
		}
		
		switch (pEvent) {
			case 'connect':
				this.connectHandler[pEvent] = pCallback;
				this.unassignedControllers!.forEach(pController => this.connectHandler[pEvent](pController));
				this.unassignedControllers!.clear();
				break;

			case 'disconnect':
				this.disconnectHandler[pEvent] = pCallback;
				break;

			default:
				this.logger.prefix('Gamepad-Module').error(`The event "${pEvent}" is not supported.`);
		}
		return this;
	}
	/**
	 * Listener function for when a gamepad is connected
	 * 
	 * @param pGamepadEvent - A gamepad event
	 */
	handleGamepadConnected(pGamepadEvent: GamepadEvent): void {
		// Create a controller from the gamepad that was connected
		// This controller only saves a snapshot of the data of when it was first created, but we update it based on new polled data
		const controller = new Controller(pGamepadEvent.gamepad);

		this.controllerMap.set(controller.index, controller);
		this.connectionOrder.push(controller.index);
		this.connectedControllers!.add(controller);
		
		// Set as main controller if it's the first one connected
		if (this.mainControllerIndex === null && this.connectionOrder.length === 1) {
			this.mainControllerIndex = controller.index;
		}
		
		if (this.connectHandler.connect) {
			this.connectHandler.connect(controller);
		} else {
			this.unassignedControllers!.add(controller);
		}
	}
	/**
	 * Listener function for when the gamepad is disconnected
	 * 
	 * @param pGamepadEvent - A gamepad event
	 */
	handleGamepadDisconnected(pGamepadEvent: GamepadEvent): void {
		// Delete the controller when it's disconnected
		// Maybe add a option to save gamepad info for a short while, incase it disconnected due to battery? 
		// When reconnected it can prompt an alert that says "restore configuration for gamepad". This will restore that configuration to the controller.
		const index = pGamepadEvent.gamepad.index;
		const controller = this.controllerMap.get(index);

		if (controller) {
			if (this.disconnectHandler.disconnect) this.disconnectHandler.disconnect(controller);

			this.connectedControllers!.delete(controller);
			this.controllerMap.delete(index);
			
			// Remove from connection order
			const orderIndex = this.connectionOrder.indexOf(index);
			if (orderIndex !== -1) {
				this.connectionOrder.splice(orderIndex, 1);
			}
			
			// If this was the main controller, set a new one
			if (this.mainControllerIndex === index) {
				this.mainControllerIndex = this.connectionOrder.length > 0 ? this.connectionOrder[0] : null;
			}
		}
	}
	/**
	 * Get the latest game state of the connected gamepads (Chrome only saves snapshots of the state, we have to keep polling to get updated states)
	 */
	pollGamepadState(): void {
		const gamepads = navigator.getGamepads();
		if (!gamepads) return;
		// Loop through all connected controllers and update their state
		for (const gamepad of gamepads) {
			// Can be null if disconnected during the session
			if (gamepad) {
				const controller = this.controllerMap.get(gamepad.index);
				if (controller) {
					controller.updateState(gamepad);
				}
			}
		}
		requestAnimationFrame(this.pollGamepadState);
	}
}


export { GamepadManagerSingleton };
export const GamepadManager = new GamepadManagerSingleton();

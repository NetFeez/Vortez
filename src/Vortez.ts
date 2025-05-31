/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Exports the main utilities of the Vortez module.
 * @module NetFeez-Labs.Vortez
 * @license Apache-2.0
 */

// Imports the main utilities of the Vortez module.
import Config from "./Config.js";
import Debug from "./Debug.js";
import Logger from "./LoggerManager/Logger.js";
import Template from "./Template.js";
import Server from "./Server/Server.js";
import Utilities from "./Utilities/Utilities.js";

// Imports the beta utilities of the Vortez module.
import JwtManager from "./Beta/JwtManager.js";
import Mail from "./Beta/Mail.js";

// Exports the beta utilities of the Vortez module.
export const Beta = { JwtManager, Mail };

// Exports the main utilities of the Vortez module.
export const Vortez = Server;
export {
	Debug, Logger,
	Utilities, Template,
	Config,
};
export default Vortez;
/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Exporta lo necesario para usar Vortez.
 * @module NetFeez-Labs.Vortez
 * @license Apache-2.0
 */

import Debug from "./Debug/Debug.js";
import Template from "./Template/Template.js";
import Vortez from "./Server/Server.js";

import JsonWT from "./JsonWT/JsonWT.js";
import Mail from "./Mail/Mail.js";

const Beta = {
	JsonWT, Mail
};

export {
	Debug, Template, Vortez, Beta
};

export default Vortez;
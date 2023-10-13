/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Añade el espacio de nombre NetFeez-Labs e Inicia los módulos requeridos por `[Servidor].js`.
 * @license Apache-2.0
 */

import Debug from "./Debug/[Debug].js";
import Plantilla from "./Plantilla/[Plantilla].js";
import Servidor from "./Servidor/[Servidor].js";

const Vortez = Servidor;
const NetFeez-Labs = {
	Debug:  Debug,
	Plantilla: Plantilla
};

export default Vortez;
export {
	Vortez,
	NetFeez-Labs
};
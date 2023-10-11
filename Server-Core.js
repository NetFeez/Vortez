/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Añade el espacio de nombre NetFeez-Labs e Inicia los módulos requeridos por `[Servidor].js`.
 */

import Debug from "./Debug/[Debug].js";
import Plantilla from "./Plantilla/[Plantilla].js";
import Servidor from "./Servidor/[Servidor].js";

export const NetFeez-Labs = {
	Debug: Debug,
	Plantilla: Plantilla
}
/**@type {typeof import('./Tipo').NetFeez-Labs.Servidor} */
export default Servidor;
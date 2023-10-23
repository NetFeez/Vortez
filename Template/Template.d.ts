/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Añade el sistema de plantillas `.vhtml`.
 * @license NetFeez-Labs
 * @module NetFeez-Labs.server_core/Plantilla
 */

export class Plantilla {
    /**Contiene las expresiones regulares que ayudan al tratamiento de las plantillas */
	private static Expresiones: {
		Variable: RegExp,
		Array: {
			Variable: RegExp,
			Formato: RegExp,
			Bloque: RegExp,
		}
	};
	/**
	 * Carga y compila una plantilla `HNetFeez-Labs` desde un archivo.
	 * @param Ruta La ruta de la plantilla.
	 * @param Datos Los datos con los que se compilara la plantilla.
	 */
	public static Cargar(Ruta: string, Datos: object): Promise<string>
	/**
	 * Compila una plantilla `.vhtml` a `Html`.
	 * @param {string} Contenido El contenido de la plantilla.
	 * @param {{}} Datos Los datos con los que se compilara la plantilla.
	 * @returns {string}
	 */
	public static Compilar(Contenido: string, Datos: object): string;
}
export default Plantilla;
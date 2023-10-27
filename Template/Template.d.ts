/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Añade el sistema de plantillas `.vhtml`.
 * @license Apache-2.0
 */

export class Template {
    /**Contiene las expresiones regulares que ayudan al tratamiento de las plantillas */
	private static Expresiones: {
		Variable: RegExp,
		Array: {
			Variable: RegExp,
			Format: RegExp,
			Block: RegExp,
		}
	};
	/**
	 * Carga y compila una plantilla `HNetFeez-Labs` desde un archivo.
	 * @param Patch La ruta de la plantilla.
	 * @param Data Los datos con los que se compilara la plantilla.
	 */
	public static Load(Patch: string, Data: object): Promise<string>
	/**
	 * Compila una plantilla `.vhtml` a `Html`.
	 * @param {string} Content El contenido de la plantilla.
	 * @param {{}} Data Los datos con los que se compilara la plantilla.
	 * @returns {string}
	 */
	public static Compile(Content: string, Data: object): string;
}
export default Template;
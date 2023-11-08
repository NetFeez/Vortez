/**
 * @author NetFeez <netfeez.dev@gmail.com>.
 * @description Añade el sistema de plantillas `.vhtml`.
 * @license Apache-2.0
 */

import FS from 'fs';

class Template {
	static Expressions = {
		Variable: /\$\{(.+?)\}/ig, //Completada
		Array: {
			Variable: /(?<=\$HNetFeez-Labs:Array{)[^]*?(?=})/ig, //Completada
			Format: /\s*?(?:<\/?HNetFeez-Labs:Array(?: .*)?>|\$HNetFeez-Labs:Array{.*?})\s*|(?: {4}|	)(?=<)/ig, //Completada
			Block: /<(HNetFeez-Labs:Array)(?: .*)?>[^]*?<\/\1(?: .*)?>/ig //Completada
		}
	};
	/**
	 * Carga y compila una plantilla `.vhtml`.
	 * @param {string} Path La ruta de la plantilla.
	 * @param {Object} Data Los datos con los que se compilara la plantilla.
	 * @returns {Promise<string>}
	 */
	static Load(Path, Data) {
		return new Promise((PrResponse, PrError) => {
			FS.stat(Path, (Error, Details) => {
				if (Error) return PrError(Error.message);
				if (! (Details.isFile())) return PrError('La ruta no pertenece a una plantilla');
				FS.readFile(Path, (Error, Template) => {
					if (Error) return PrError(Error.message);
					PrResponse(this.Compile(Template.toString(), Data));
				});
			});
		});
	}
	/**
	 * Compila una plantilla `.vhtml` a `Html`.
	 * @param {string} Content El contenido de la plantilla.
	 * @param {{}} Data Los datos con los que se compilara la plantilla.
	 * @returns {string}
	 */
	static Compile(Content, Data) {
		Content = Content.replace(this.Expressions.Variable, (Text, G1) => {
			if (G1 && G1 !== '' && G1 in Data) return Data[G1];
			else return Text;
		});
		for (let ID in Data) {
			if (typeof Data[ID] == 'object')  {
				Content = this.CompileOBJ(Content, ID, Data[ID]);
			}
		}
		return Content;
	}
	/**
	 * Compila la etiqueta <HNetFeez-Labs:Array>.
	 * @param {string} Content El Contenido del bloque.
	 * @param {(string|number)} Name El ID de los Datos.
	 * @param {Object} Data Los datos con los que se compilara la sub plantilla.
	 * @returns {string}
	 */
	static CompileOBJ(Content, Name, Data) {
		let Blocks = Content.match(this.Expressions.Array.Block);
		if (Blocks) for (let Block of Blocks) {
			let Variable = Block.match(this.Expressions.Array.Variable);
			if (Variable) if (Name == Variable[0]) {
				let Format = Block.replace(this.Expressions.Array.Format, '');
				let SubTemplate = '';
				for (let ID in Data) {//@ts-ignore
					SubTemplate += Format.replaceAll(
						`$Array{Valor}`, Data[ID]
					).replaceAll(`$Array{ID}`, ID);
				}//@ts-ignore
				Content = Content.replaceAll(Block, SubTemplate);
			}
		}
		return Content;
	};
}
export default Template;
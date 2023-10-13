import Vortez from "../Vortez.js";

const Servidor = new Vortez(80);

Servidor.Añadir_Reglas({
    Método: 'GET', Url: '/',
    Tipo: 'Carpeta', Opciones: {
        Recurso: './'
    }
});
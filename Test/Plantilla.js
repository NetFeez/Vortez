import Plantilla from "../Template/Template.js";

(async () => console.log(
    await Plantilla.Load('./Test/Plantilla.vhtml', {
        Titulo: 'Titulo de la prueba',
        Des: 'Descripción xD',
        AR: {
            Algo: 'Algo 1',
            Otra: 'Otra2'
        }
    })
))();
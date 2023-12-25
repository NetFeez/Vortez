import Plantilla from "../../Template/Template.js";

(async () => console.log(
    await Plantilla.Load('./Test/Plantilla.vhtml', {
        Titulo: 'Titulo de la prueba',
        Des: 'Descripción xD',
        Tests: ["algo", "algo2"]
    })
))();
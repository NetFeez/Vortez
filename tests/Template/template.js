import Template from "../../build/Template.js";

console.log(await Template.load('tests/Template/template.txt', {
    tittle: "Hola mundo",
    users: {
        diego: true,
        juan: false,
        pedro: true,
        maria: false,
        jorge: true
    }
}))
console.log('----------------------------------------')
console.log(await Template.load('tests/Template/template.vhtml', {
    Titulo: 'Titulo de la prueba',
    Des: 'Descripción xD',
    Tests: ["algo", "algo2"]
}));
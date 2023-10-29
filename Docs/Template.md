# Indice
[Volver atrás](../)

## Lista de propiedades

No hay propiedades a tener en cuenta

## Lista de métodos

|Método	      |static|Descripción          |
|------------:|-----:|:--------------------|
|[Load](#load)|Si    |Envía un log de Debug|

# Uso de los métodos

## Load

El método load recibe 2 parámetros (Path, Data) y devuelve una promesa de string

```ts
Load(Path: string, Data: Object): Promise<string>;
```

|Parámetro|Nulo|Tipo   |Default|Descripción                                                              |
|--------:|---:|------:|------:|:--------------------------------------|
|Path     |No  |string |       |La ruta de la plantilla                |
|Data     |No  |Object |       |Los datos que se pasaran a la plantilla|

```js
import { Template, Debug } from 'Vortez/Vortez.js';

const DefDebug = new Debug();
const Errores = new Debug('Errores', 'MyDebug', true);

Template.Load('./Templates/index.vhtml', {
    Titulo: 'Page index',
    Usuarios: [
        'NetFeez', 'TakoMics', 'OtroUsuario'
    ]
}).then((Result) => {
    DefDebug.Log(Result) // En el caso de querer mostrarlo en el debug de Vortez
    console.log(Result) // Solo para mostrarlo en consola
}).catch(Error => Errores.Log(Error));

```

Plantilla usada en el ejemplo anterior

```html
<!--index.vhtml-->
<html>
    <head>
        <title>$Variable{Titulo}</tile>
    </head>
    <body>
        <h1>$Variable{Titulo}</h1>
        <h2>Lista de usuarios</h2>
        <HNetFeez-Labs:Array>
            $HNetFeez-Labs:Array{Usuarios}
            <li>$Array{ID} - $Array{Valor}</li>
        </HNetFeez-Labs:Array>
    </body>
</html>
```
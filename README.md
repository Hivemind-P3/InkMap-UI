# InkMap-UI
Este proyecto se generó usando la versión 21.2.2 de [Angular CLI](https://github.com/angular/angular-cli)

## Instalación
---
### Requisitos
- Node.js v25.7.0

### Instalar dependencias
Para instalar las dependencias del proyecto, correr el siguiente comando en la terminal:
```bash
npm install
```
El proyecto debería tener un folder llamado `node_modules`

### Correr el proyecto

Para iniciar el proyecto, correr el siguiente comando en la terminal:

```bash
npm start
```
Cuando el proyecto termine de iniciar, abrir el navegador y navegar a `http://localhost:4200/`. La aplicación se actualizará automáticamente cuando se modifiquen los source files.

### Generar componentes

Para generar un nuevo componente de angular, correr el siguiente comando en la terminal:

```bash
ng generate component component-name
```

## Flujo de trabajo
---
El proyecto seguirá el siguiente flujo de trabajo:
1. Crear una nueva rama por cada historia de usuario tomando `dev` como base. El nombre de la rama deberá seguir este formato
    * `[nombre-de-desarrollador]-[descripción-breve-de-funcionalidad]`
<br>
2. Al terminar la funcionalidad se hará un pull request a la rama `test` con una descripción de qué se está implementando
<br>
3. El pull request a `test` será autorizado (code review) por el coordinador de soporte (Jose Daniel Steller) o desarrollo (Axel Jiménez)
<br>
4. Otro desarrollador deberá crear los casos de prueba utilizando la [plantilla del drive](https://docs.google.com/spreadsheets/d/1fzYvGnlQ998Z2fwOR1Gk8WeX80EbtQQENgHlmDPivtw/edit?usp=drive_link)
<br>
5. El archivo se adjuntará en la historia de usuario en Jira
<br>
6. Cuando los casos de prueba estén listos se realizará otro pull request a la rama `main` con los mismos requisitos de los pull requests a `test`
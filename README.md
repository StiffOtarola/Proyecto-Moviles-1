# Proyecto Moviles 1 - Registro de Locales (Cordova)

Base de proyecto para cumplir la guia de ITI-621.

## Funcionalidades implementadas

- CRUD de locales: agregar, editar, eliminar, buscar y limpiar.
- Validaciones:
  - Llave primaria: ID Local no duplicado.
  - Campos obligatorios: ID, descripcion, recomendacion, foto y ubicacion.
- Captura de imagen con plugin de camara.
- Geolocalizacion con plugin de geolocation.
- Flujo de botones:
  - Editar y eliminar deshabilitados al inicio.
  - Se habilitan al seleccionar un registro.
  - Limpiar restablece estado y campos.
- Limpieza automatica de formulario tras agregar/editar/eliminar.

## Requisitos previos

- Node.js LTS
- Java 17+
- Android Studio + Android SDK
- Apache Cordova global

## Crear proyecto Cordova desde esta base

1. Abrir terminal en esta carpeta.
2. Inicializar npm:

```bash
npm init -y
```

3. Instalar Cordova en el proyecto:

```bash
npm install cordova --save-dev
```

4. Crear plataforma Android:

```bash
npx cordova platform add android
```

5. Instalar plugins necesarios:

```bash
npx cordova plugin add cordova-plugin-camera
npx cordova plugin add cordova-plugin-geolocation
```

6. Ejecutar en dispositivo/emulador:

```bash
npx cordova run android
```

## Icono de la aplicacion

- Coloca un icono cuadrado PNG en `resources/icon.png` (recomendado 1024x1024).
- Luego ejecuta build para que Cordova lo aplique.

## Generar AAB (entrega)


1. Build release:

```bash
npx cordova build android --release -- --packageType=bundle
```

2. Ubicacion esperada del AAB:

- `platforms/android/app/build/outputs/bundle/release/app-release.aab`

## Nota de defensa

Prepara una demostracion rapida de:

- Validacion de llave primaria duplicada.
- Error por campos obligatorios vacios.
- Captura de foto guardada en el registro.
- Obtencion de ubicacion real.
- Flujo correcto de botones al seleccionar/limpiar.

# Widkueski

Widkueski es una extensión de Chrome creada con [Plasmo](https://docs.plasmo.com/) que integra un widget para simular opciones de financiamiento de Kueski directamente en páginas de comercio electrónico.

## Requisitos

- Node.js 18 o superior
- npm
- Google Chrome o un navegador compatible con extensiones de Chrome

## Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone <URL_DEL_REPOSITORIO>
cd widkueski
npm install
```

## Ejecutar en desarrollo

Inicia Plasmo en modo desarrollo:

```bash
npm run dev
```

Este comando genera la extensión de desarrollo en:

```text
build/chrome-mv3-dev
```

Mientras `npm run dev` esté activo, Plasmo recompila los cambios automáticamente.

## Cargar la extensión en Chrome

1. Abre Chrome y entra a `chrome://extensions`.
2. Activa el `Modo de desarrollador` en la esquina superior derecha.
3. Haz clic en `Cargar descomprimida`.
4. Selecciona la carpeta `build/chrome-mv3-dev`.
5. Abre una página web compatible y verifica que aparezca el widget de Widkueski.

Cuando hagas cambios en el código, vuelve a la página de extensiones y presiona el botón de recargar de Widkueski si Chrome no actualiza la extensión automáticamente.

## Generar build de producción

Para crear una versión lista para distribuir:

```bash
npm run build
```

La salida de producción se genera en:

```text
build/chrome-mv3-prod
```

## Empaquetar la extensión

Para generar el paquete comprimido:

```bash
npm run package
```

Plasmo crea el archivo `.zip` dentro de `build/`. Ese archivo sirve para compartir la extensión o prepararla para publicación.

## Estructura principal

- `content.tsx`: widget que se inyecta en las páginas web.
- `popup.tsx`: interfaz del popup de la extensión.
- `assets/`: recursos visuales como íconos.
- `package.json`: scripts, dependencias y configuración base de la extensión.

## Notas antes de subir a GitHub

El proyecto ignora dependencias, builds locales, paquetes generados, caches, logs y archivos de entorno. No subas manualmente carpetas como `node_modules/`, `.plasmo/` o `build/`; se regeneran con los comandos anteriores.

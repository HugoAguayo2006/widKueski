# Widkueski

Widkueski es una extension de Chrome creada con [Plasmo](https://docs.plasmo.com/) que integra un widget para simular opciones de financiamiento de Kueski directamente en paginas de e-commerce.

## Requisitos

- Node.js 18 o superior
- npm
- Google Chrome o un navegador compatible con extensiones de Chrome

## Instalacion

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

Este comando genera la extension de desarrollo en:

```text
build/chrome-mv3-dev
```

Mientras `npm run dev` este activo, Plasmo recompila los cambios automaticamente.

## Cargar la extension en Chrome

1. Abre Chrome y entra a `chrome://extensions`.
2. Activa el `Modo de desarrollador` en la esquina superior derecha.
3. Haz clic en `Cargar descomprimida`.
4. Selecciona la carpeta `build/chrome-mv3-dev`.
5. Abre una pagina web compatible y verifica que aparezca el widget de Widkueski.

Cuando hagas cambios en el codigo, vuelve a la pagina de extensiones y presiona el boton de recargar de Widkueski si Chrome no actualiza la extension automaticamente.

## Generar build de produccion

Para crear una version lista para distribuir:

```bash
npm run build
```

La salida de produccion se genera en:

```text
build/chrome-mv3-prod
```

## Empaquetar la extension

Para generar el paquete comprimido:

```bash
npm run package
```

Plasmo crea el archivo `.zip` dentro de `build/`. Ese archivo sirve para compartir la extension o prepararla para publicacion.

## Estructura principal

- `content.tsx`: widget que se inyecta en las paginas web.
- `popup.tsx`: interfaz del popup de la extension.
- `assets/`: recursos visuales como iconos.
- `package.json`: scripts, dependencias y configuracion base de la extension.

## Notas antes de subir a GitHub

El proyecto ignora dependencias, builds locales, paquetes generados, caches, logs y archivos de entorno. No subas manualmente carpetas como `node_modules/`, `.plasmo/` o `build/`; se regeneran con los comandos anteriores.
# widKueski

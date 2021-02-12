# `<shader-art>` TexturePlugin

## Installation

Install via NPM:

```sh
npm i shader-art @shader-art/plugin-texture
```

Or use directly via skypack:

```js
import { TexturePlugin } from 'https://cdn.skypack.dev/@shader-art/plugin-texture';
```

## Usage

Texture support can be added via a TexturePlugin.

You can load the texture plugin by importing the TexturePlugin and adding it to the `ShaderArt.register` call like this:

```js
ShaderArt.register([() => new TexturePlugin()]);
```

- [Example using textures on CodePen](https://codepen.io/terabaud/pen/xxROeRJ)

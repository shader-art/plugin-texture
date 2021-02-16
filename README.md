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

### Adding textures to your `shader-art`

Inside the shader art component, add an `img` tag like this;

```html
<img
  src="https://placekitten.com/512/512"
  name="cat"
  wrap-s="mirrored-repeat"
  wrap-t="clamp-to-edge"
  min-filter="nearest"
  mag-filter="nearest"
  hidden
/>
```

Inside your glsl shader code (which is placed inside a `<script type="vert|frag">` tag), you can access the texture via
a uniform variable:

```
uniform sampler2D cat;
```

### Attributes

- `src` url of the texture.
- `name` name of the uniform variable
- `wrap-s` horizontal texture wrapping (mirrored-repeat|repeat(default)|clamp-to-edge)
- `wrap-t` vertical texture wrapping (mirrored-repeat|repeat(default)|clamp-to-edge)
- `min-filter` texture minification filter (linear, nearest(default), nearest-mipmap-nearest, linear-mipmap-nearest, linear-mipmap-linear, nearest-mipmap-linear)
- `mag-filter` texture magnification filter (linear|nearest(default))

### Further resources

For more information about using textures inside glsl code, look at [`texture2D`](https://thebookofshaders.com/glossary/?search=texture2D).

### Example

- [Example using textures on CodePen](https://codepen.io/terabaud/pen/xxROeRJ)

import { ShaderArtPlugin } from '@shader-art/plugin-base';
import { TexturePlugin, TexturePluginFactory } from './index';
import { ShaderArtShim } from './test-utils/shader-art-shim';

function wait(timeout = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

const testTexture = (
  name = 'texture',
  src = 'https://placekitten.com/128/128'
) => `<img
  src="${src}"
  name="${name}"
  wrap-s="clamp-to-edge"
  wrap-t="clamp-to-edge"
  min-filter="nearest"
  mag-filter="nearest"
  hidden
>`;

const vertexShader = `
  <script type="vert">
    precision highp float;
    attribute vec4 position;
    void main() {
      gl_Position = position;
    }
  </script>
`;

const fragmentShader = `
  <script type="frag">
    precision highp float;
    uniform vec2 resolution;
    unifrom texture2D texture;
    void main() {
      vec2 p = gl_FragCoord.xy / resolution;
      gl_FragColor = texture2D(texture, p);
    }
  </script>
`;

const createShaderArt = (html: string): ShaderArtShim => {
  const element = document.createElement('shader-art');
  element.setAttribute('autoplay', '');
  element.innerHTML = html;
  document.body.appendChild(element);
  return element as ShaderArtShim;
};

class ImageMockOnLoad extends Image {
  constructor(width?: number, height?: number) {
    super(width, height);
    // mimic placeholder image provider behavior, a url ending with /:width/:height
    // returns an image with the according width and height
    const sizeRoute = /(\d+)\/(\d+)\/?$/;
    setTimeout(() => {
      const matches = this.src.match(sizeRoute);
      if (matches) {
        this.width = parseInt(matches[1], 10);
        this.height = parseInt(matches[2], 10);
      }
      const ev = new Event('load');
      this.dispatchEvent(ev);
    }, 50);
  }
}

describe('TexturePlugin tests', () => {
  const originalImage = global.Image;

  beforeAll(() => {
    global.Image = ImageMockOnLoad;
    ShaderArtShim.register([TexturePluginFactory]);
  });

  afterAll(() => {
    global.Image = originalImage;
  });

  test('shader-art has loaded the TexturePlugin', () => {
    expect(ShaderArtShim.plugins).toContain(TexturePluginFactory);
  });

  test('test if the test environment supports loading images', async () => {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = 'https://placekitten.com/128/136';
      img.onload = () => {
        expect(img.width).toBe(128);
        expect(img.height).toBe(136);
        resolve();
      };
      img.onerror = () => {
        reject();
      };
    });
  });

  test('test if the test environment supports MutationObserver', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    let mutated = false;
    const observer = new MutationObserver(() => {
      mutated = true;
    });
    observer.observe(div, { subtree: true, childList: true });
    const p = document.createElement('p');
    p.textContent = 'Hi';
    div.appendChild(p);
    await wait(0);
    expect(mutated).toBe(true);
  });

  test('shader-art creation', () => {
    const element = createShaderArt(
      testTexture() + vertexShader + fragmentShader
    );
    expect(element).toBeDefined();
    expect(element.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(element.activePlugins.map((p: ShaderArtPlugin) => p.name)).toContain(
      'TexturePlugin'
    );
  });

  test('shader-art defines a texture', async () => {
    const element = createShaderArt(
      testTexture() + vertexShader + fragmentShader
    );
    const texturePlugin = element.activePlugins.find(
      (p) => p.name === 'TexturePlugin'
    );
    expect(texturePlugin).toBeDefined();
    expect(texturePlugin).toBeInstanceOf(TexturePlugin);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    const textureState = (<TexturePlugin>texturePlugin)?.textureState;
    expect(Object.keys(textureState)).toContain('texture');
  });

  test('shader-art defines a texture, and then updates it when the src attrib is changed', async () => {
    const element = createShaderArt(
      testTexture() + vertexShader + fragmentShader
    );
    const texturePlugin = element.activePlugins.find(
      (p) => p.name === 'TexturePlugin'
    );
    expect(texturePlugin).toBeDefined();
    expect(texturePlugin).toBeInstanceOf(TexturePlugin);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    const textureState = (<TexturePlugin>texturePlugin)?.textureState;
    expect(Object.keys(textureState)).toContain('texture');

    const img = element.querySelector('img');
    expect(img).toBeDefined();
    img?.setAttribute('src', 'https://picsum.photos/128/128');
    await wait(0);
    expect((<TexturePlugin>texturePlugin).imagesLoaded).toBe(false);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    let newTextureState = (<TexturePlugin>texturePlugin)?.textureState;
    expect(Object.keys(newTextureState)).toContain('texture');
    expect(newTextureState.texture.src).toBe('https://picsum.photos/128/128');

    img?.setAttribute('src', 'https://picsum.photos/135/124');
    await wait(0);
    expect((<TexturePlugin>texturePlugin).imagesLoaded).toBe(false);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    newTextureState = (<TexturePlugin>texturePlugin)?.textureState;
    expect(Object.keys(newTextureState)).toContain('texture');
    expect(newTextureState.texture.src).toBe('https://picsum.photos/135/124');
  });

  test('shader-art defines a texture and then loads another one when the dom is modified afterwards', async () => {
    const element = createShaderArt(vertexShader + fragmentShader);
    const texturePlugin = element.activePlugins.find(
      (p) => p.name === 'TexturePlugin'
    );
    expect(texturePlugin).toBeDefined();
    expect(texturePlugin).toBeInstanceOf(TexturePlugin);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    const img = document.createElement('img');

    img.setAttribute('src', 'https://placekitten.com/128/128');
    img.setAttribute('name', 'texture');
    element.appendChild(img);

    // let MutationObserver do its thing
    await wait(0);
    expect((<TexturePlugin>texturePlugin).imagesLoaded).toBe(false);
    await (<TexturePlugin>texturePlugin).whenImagesLoaded();
    const textureState = (<TexturePlugin>texturePlugin)?.textureState;
    expect(Object.keys(textureState)).toContain('texture');
    expect(textureState.texture.src).toBe('https://placekitten.com/128/128');
  });

  afterEach(() => {
    const sc = document.querySelector('shader-art');
    if (sc) {
      sc.remove();
    }
  });
});

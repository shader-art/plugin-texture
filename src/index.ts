import { ShaderArtPlugin } from '@shader-art/plugin-base';

import { loadImage } from './image-loader';

export interface ShaderArtTexture {
  src: string;
  idx: number;
  name: string;
  options?: Record<string, string>;
}
export interface ShaderArtTextureState extends ShaderArtTexture {
  image: HTMLImageElement;
  uniformLoc: WebGLUniformLocation | null;
  texture: WebGLTexture | null;
}
export class TexturePlugin implements ShaderArtPlugin {
  name = 'TexturePlugin';
  initialized = false;
  imagesLoaded = false;
  indexCounter = 0;
  observer: MutationObserver | null = null;

  textureState: Record<string, ShaderArtTextureState> = {};

  hostElement: HTMLElement | null = null;
  gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  program: WebGLProgram | null = null;
  canvas: HTMLCanvasElement | null = null;

  public setup(
    hostElement: HTMLElement,
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    program: WebGLProgram,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    this.hostElement = hostElement;
    this.gl = gl;
    this.program = program;
    this.canvas = canvas;
    this.indexCounter = 0;
    // The texture plugin looks for <IMG> elements
    this.observer = new MutationObserver((mutations) => {
      this.imagesLoaded = false;
      const enter: ShaderArtTexture[] = [];
      const update: ShaderArtTexture[] = [];
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLElement) {
          if (mutation.type === 'attributes') {
            // a texture got updated
            update.push(this.getTextureMetaData(mutation.target));
          }
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (
                node.nodeType === Node.ELEMENT_NODE &&
                node.nodeName === 'IMG'
              ) {
                // a new texture was added
                enter.push(this.getTextureMetaData(node as HTMLElement));
              }
            }
          }
          this.loadImagesAndUpload(enter, update);
        }
      }
    });
    this.observer.observe(this.hostElement, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['src'],
    });
    const enter = [...this.hostElement.querySelectorAll('img')].map((element) =>
      this.getTextureMetaData(element as HTMLElement)
    );
    return this.loadImagesAndUpload(enter, []);
  }

  whenImagesLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.imagesLoaded) {
        resolve();
        return;
      }
      this.hostElement?.addEventListener(
        'textureload',
        ((e: CustomEvent) => {
          const { error } = e.detail;
          if (error) {
            reject(error);
            return;
          }
          resolve();
        }) as EventListener,
        {
          once: true,
        }
      );
    });
  }

  public dispose(): void {
    if (!this.gl) {
      return;
    }
    this.indexCounter = 0;
    for (const tex of Object.values(this.textureState)) {
      if (tex.texture !== null) {
        this.gl.deleteTexture(tex.texture);
      }
    }
    this.textureState = {};
    if (this.observer) {
      this.observer.takeRecords();
      this.observer.disconnect();
      this.observer = null;
    }
    this.gl = null;
    this.hostElement = null;
    this.canvas = null;
    this.program = null;
  }

  private getTextureMetaData(element: HTMLElement): ShaderArtTexture {
    const attribs: Record<string, string>[] = [...element.attributes]
      .filter((attr) => ['src', 'name'].indexOf(attr.name) === -1)
      .map((attr) => ({
        [attr.name]: attr.value,
      }));
    const options: Record<string, string> = Object.assign.apply(null, [
      {},
      ...attribs,
    ]);
    const name = element.getAttribute('name') || '';
    const src = element.getAttribute('src') || '';
    let idx = this.textureState[name]?.idx;
    if (typeof idx === 'undefined' || isNaN(idx)) {
      idx = this.indexCounter;
      this.indexCounter++;
    }
    return { idx, src, name, options };
  }

  private loadTextures(
    textures: ShaderArtTexture[]
  ): Promise<Record<string, HTMLImageElement>> {
    return new Promise<Record<string, HTMLImageElement>>((resolve, reject) => {
      const queue = [];
      const textureImages: Record<string, HTMLImageElement> = {};
      for (const texture of textures) {
        if (!textureImages[texture.src]) {
          queue.push(loadImage(texture.src));
        }
      }
      Promise.all(queue)
        .then((images: HTMLImageElement[]) => {
          for (const img of images) {
            textureImages[img.src] = img;
          }
          resolve(textureImages);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  private applyTextureOptions(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    options?: Record<string, string>,
    textureType = WebGLRenderingContext.TEXTURE_2D
  ) {
    const defaults: Record<string, string> = {
      'min-filter': 'nearest',
      'mag-filter': 'nearest',
    };
    const glOptionCodes: Record<string, number> = {
      'min-filter': gl.TEXTURE_MIN_FILTER,
      'mag-filter': gl.TEXTURE_MAG_FILTER,
      'wrap-s': gl.TEXTURE_WRAP_S,
      'wrap-t': gl.TEXTURE_WRAP_T,
      // WebGL 2 additions
      'base-level': WebGL2RenderingContext.TEXTURE_BASE_LEVEL,
      'compare-func': WebGL2RenderingContext.TEXTURE_COMPARE_FUNC,
      'compare-mode': WebGL2RenderingContext.TEXTURE_COMPARE_MODE,
      'max-level': WebGL2RenderingContext.TEXTURE_MAX_LEVEL,
      'max-lod': WebGL2RenderingContext.TEXTURE_MAX_LOD,
      'min-lod': WebGL2RenderingContext.TEXTURE_MIN_LOD,
      'wrap-r': WebGL2RenderingContext.TEXTURE_WRAP_R,
    };
    const glValueCodes: Record<string, number> = {
      nearest: gl.NEAREST,
      linear: gl.LINEAR,
      'nearest-mipmap-nearest': gl.NEAREST_MIPMAP_LINEAR,
      'nearset-mipmap-nearest': gl.NEAREST_MIPMAP_NEAREST,
      'linear-mipmap-linear': gl.LINEAR_MIPMAP_LINEAR,
      'linear-mipmap-nearest': gl.LINEAR_MIPMAP_NEAREST,
      repeat: gl.REPEAT,
      'mirrored-repeat': gl.MIRRORED_REPEAT,
      'clamp-to-edge': gl.CLAMP_TO_EDGE,
      // WebGL 2 additions
      lequal: gl.LEQUAL,
      gequal: gl.GEQUAL,
      less: gl.LESS,
      greater: gl.GREATER,
      equal: gl.EQUAL,
      notequal: gl.NOTEQUAL,
      always: gl.ALWAYS,
      never: gl.NEVER,
      none: gl.NONE,
      'compare-ref-to-texture': WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE,
    };

    const optionsWithDefaults = Object.assign({}, defaults, options || {});
    for (const [key, value] of Object.entries(optionsWithDefaults)) {
      if (key in glOptionCodes === false) {
        continue;
      }
      if (value in glValueCodes) {
        gl.texParameteri(textureType, glOptionCodes[key], glValueCodes[value]);
        continue;
      }
      const numericValue = parseFloat(value);
      if (!Number.isNaN(numericValue)) {
        gl.texParameteri(textureType, glOptionCodes[key], numericValue);
      }
    }
  }

  /**
   * Load images, then upload to GPU
   * @param enter
   * @param update
   */
  private loadImagesAndUpload(
    enter: ShaderArtTexture[],
    update: ShaderArtTexture[]
  ): Promise<void> {
    this.imagesLoaded = false;
    return new Promise<void>((resolve, reject) => {
      this.loadTextures([...enter, ...update])
        .then((textureImages) => {
          this.uploadTextures(textureImages, enter, update);
          this.imagesLoaded = true;
          this.hostElement?.dispatchEvent(
            new CustomEvent('textureload', { detail: { error: null } })
          );
          resolve();
        })
        .catch((error) => {
          this.hostElement?.dispatchEvent(
            new CustomEvent('textureload', { detail: { error } })
          );
          reject(error);
        });
    });
  }

  /**
   * Upload images to GPU
   *
   * @param textureImages dictionary of images (return value from loadTextures)
   * @param enter the enter-collection of textures (textures added to the canvas)
   * @param update the update-collection of textures (textures updated)
   */
  private uploadTextures(
    textureImages: Record<string, HTMLImageElement>,
    enter: ShaderArtTexture[],
    update: ShaderArtTexture[]
  ) {
    this.imagesLoaded = false;
    const { gl, program } = this;
    if (!gl || !program) {
      return null;
    }
    enter.map((item) => {
      const image = textureImages[item.src];
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + item.idx);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      this.applyTextureOptions(gl, item.options);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      // Set a uniform variable containing the texture index
      const uniformLoc = gl.getUniformLocation(program, item.name);
      gl.uniform1i(uniformLoc, item.idx);
      this.textureState[item.name] = {
        ...item,
        image,
        uniformLoc,
        texture,
      };
    });
    update.map((item) => {
      const image = textureImages[item.src];
      const oldTexture = this.textureState[item.name].texture;
      const oldImage = this.textureState[item.name].image;
      if (image.width === oldImage.width && image.height === oldImage.height) {
        gl.activeTexture(gl.TEXTURE0 + item.idx);
        gl.bindTexture(gl.TEXTURE_2D, oldTexture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
      } else {
        if (oldTexture !== null) {
          gl.deleteTexture(oldTexture);
        }
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + item.idx);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.applyTextureOptions(gl, item.options);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
        this.textureState[item.name].texture = texture;
      }
      this.textureState[item.name].src = item.src;
      this.textureState[item.name].image = image;
    });
  }
}

export const TexturePluginFactory = (): TexturePlugin => new TexturePlugin();

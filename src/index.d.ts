import { ShaderArtPlugin } from '@shader-art/plugin-base';
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
export declare class TexturePlugin implements ShaderArtPlugin {
    name: string;
    initialized: boolean;
    imagesLoaded: boolean;
    indexCounter: number;
    observer: MutationObserver | null;
    textureState: Record<string, ShaderArtTextureState>;
    hostElement: HTMLElement | null;
    gl: WebGLRenderingContext | WebGL2RenderingContext | null;
    program: WebGLProgram | null;
    canvas: HTMLCanvasElement | null;
    constructor();
    setup(hostElement: HTMLElement, gl: WebGLRenderingContext | WebGL2RenderingContext, program: WebGLProgram, canvas: HTMLCanvasElement): Promise<void>;
    whenImagesLoaded(): Promise<void>;
    dispose(): void;
    private getTextureMetaData;
    private loadTextures;
    private applyTextureOptions;
    /**
     * Load images, then upload to GPU
     * @param enter
     * @param update
     */
    private loadImagesAndUpload;
    /**
     * Upload images to GPU
     *
     * @param textureImages dictionary of images (return value from loadTextures)
     * @param enter the enter-collection of textures (textures added to the canvas)
     * @param update the update-collection of textures (textures updated)
     */
    private uploadTextures;
}
export declare const TexturePluginFactory: () => TexturePlugin;

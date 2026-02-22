import { Node, nodePasteRule, mergeAttributes } from "@tiptap/core";

const VIMEO_REGEX =
  /https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\?.*)?/g;

function getVimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export const Vimeo = Node.create({
  name: "vimeo",

  addOptions() {
    return {
      addPasteHandler: true,
      HTMLAttributes: {},
      width: 640,
      height: 360,
    };
  },

  group: "block",
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-vimeo-video]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const iframe = el.querySelector("iframe");
          const src = iframe?.getAttribute("src") ?? null;
          return { src };
        },
      },
    ];
  },

  addPasteRules() {
    if (!this.options.addPasteHandler) return [];
    return [
      nodePasteRule({
        find: VIMEO_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const embed = getVimeoEmbedUrl(match[0]);
          return { src: embed ?? match[0] };
        },
      }),
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    if (!src) return ["div", { "data-vimeo-video": "" }, ["iframe", { src: "#" }]];
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, { "data-vimeo-video": "" }),
      [
        "iframe",
        mergeAttributes(
          {
            src,
            width: this.options.width,
            height: this.options.height,
            frameborder: "0",
            allow: "fullscreen; picture-in-picture",
            allowfullscreen: "true",
            class: "rounded-lg w-full aspect-video max-w-2xl",
          },
          {}
        ),
      ],
    ];
  },
});

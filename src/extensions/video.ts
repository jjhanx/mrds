import { Node, mergeAttributes } from "@tiptap/core";

export const Video = Node.create({
  name: "video",

  addOptions() {
    return {
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
        tag: "video[src]",
        getAttrs: (dom) => {
          const el = dom as HTMLVideoElement;
          return { src: el.getAttribute("src") };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src;
    if (!src) return ["video", { controls: "", class: "rounded-lg max-w-full" }];
    return [
      "video",
      mergeAttributes(
        this.options.HTMLAttributes,
        {
          src,
          controls: "",
          class: "rounded-lg border border-stone-200 max-w-full max-h-96 w-full",
          preload: "metadata",
        }
      ),
    ];
  },
});

// 博客文章元数据
// 每个 slug 对应一篇文章；正文存于 i18n messages/blog.{slug}.content（string[]）
// title / description 字段为 EN 参考值，实际渲染走 i18n（en + zh）
// datePublished 为 ISO 8601 字符串；author 统一为 "Neetpix Team"

export type BlogPost = {
  slug: string; // URL slug，如 "pdf-tools-privacy-risk"
  title: string; // EN 标题（参考用，实际展示走 i18n）
  description: string; // EN 描述（参考用，实际展示走 i18n）
  datePublished: string; // ISO 8601，如 "2026-07-21"
  author: string;
  readingTime: number; // 分钟
  category: "privacy" | "comparison";
  toolKey: string[]; // 关联工具 key 数组，首项为主关联工具（用于 CTA），全部用于 RelatedTools
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "pdf-tools-privacy-risk",
    title: "The Hidden Privacy Risks of Online PDF Tools",
    description:
      "Most online PDF tools upload your documents to remote servers. Learn what happens to your files and how browser-local processing keeps them private.",
    datePublished: "2026-07-21",
    author: "Neetpix Team",
    readingTime: 7,
    category: "privacy",
    toolKey: ["pdfMerge", "pdfToWord"],
  },
  {
    slug: "smallpdf-free-alternative",
    title: "The Best Free Smallpdf Alternative in 2026",
    description:
      "Smallpdf limits free users to 2 tasks per day and uploads files to its servers. Neetpix is fully free, unlimited, and processes everything in your browser.",
    datePublished: "2026-07-21",
    author: "Neetpix Team",
    readingTime: 6,
    category: "comparison",
    toolKey: ["pdfMerge", "pdfCompress", "pdfToWord"],
  },
  {
    slug: "remove-bg-free-alternative",
    title: "Free Remove.bg Alternative: No Upload, No Limit",
    description:
      "Remove.bg charges for HD downloads and uploads images to its servers. Neetpix removes backgrounds locally in your browser with transformers.js + onnxruntime-web.",
    datePublished: "2026-07-21",
    author: "Neetpix Team",
    readingTime: 6,
    category: "comparison",
    toolKey: ["removeBackground"],
  },
  {
    slug: "tinypng-free-alternative",
    title: "TinyPNG Free Alternative: Compress Images Locally",
    description:
      "TinyPNG caps free users at 20 images per month and uploads them to its servers. Neetpix compresses images in your browser with no limit and no upload.",
    datePublished: "2026-07-21",
    author: "Neetpix Team",
    readingTime: 6,
    category: "comparison",
    toolKey: ["imageCompress"],
  },
];

export const BLOG_POST_MAP: Record<string, BlogPost> = BLOG_POSTS.reduce(
  (acc, post) => {
    acc[post.slug] = post;
    return acc;
  },
  {} as Record<string, BlogPost>,
);

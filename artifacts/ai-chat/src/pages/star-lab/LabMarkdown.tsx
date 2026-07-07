import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download } from "lucide-react";

const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i;

function preprocessContent(content: string): string {
  let result = content;

  // 1. "URL: https://...image.png" → markdown image
  result = result.replace(
    /URL:\s*(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?\S*)?)/gi,
    (_, url) => `\n\n![Generated image](${url})\n\n`
  );

  // 2. "Saved to: /opt/sirius/.../renders/file.png" → URL → markdown image
  result = result.replace(
    /Saved to:\s*\/opt\/sirius\/artifacts\/api-server\/public\/renders\/([\w.\-]+)/gi,
    (_, filename) => `\n\n![Generated image](https://sirius-ai.live/api/lab/renders/${filename})\n\n`
  );

  // 3. Bare https://sirius-ai.live/api/lab/renders/file.png not already in markdown
  result = result.replace(
    /(?<!\()( |^)(https?:\/\/[^\s)]+\/api\/lab\/renders\/[\w.\-]+)/gm,
    (_, space, url) => `${space}\n\n![Generated image](${url})\n\n`
  );

  // 4. Any bare https URL ending in an image extension not already inside a markdown link/image
  //    Catches OpenAI CDN URLs, Pollinations URLs, etc. — anything like https://...img.png or ...img.jpg?query=...
  //    The (?<!\() lookbehind prevents double-converting URLs already inside ![](url) from rules 1-3
  result = result.replace(
    /(?<!\()(https?:\/\/[^\s)\]"']+\.(png|jpg|jpeg|gif|webp|bmp|svg)([?#][^\s)\]"']*)?)/gi,
    (url) => `\n\n![Generated image](${url})\n\n`
  );

  return result;
}

export function LabMarkdown({ content, streaming }: { content: string; streaming: boolean }) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const copyBlock = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  let codeBlockIdx = 0;
  const processed = preprocessContent(content);

  return (
    <div style={{ fontSize: "0.82rem", color: "rgba(15,23,42,0.82)", lineHeight: 1.65 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 mb-2 mt-3 first:mt-0 border-b pb-1" style={{ borderColor: "rgba(15,23,42,0.15)" }}>{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" style={{ color: "hsl(193,100%,32%)" }}>{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 mt-2 first:mt-0" style={{ color: "rgba(15,23,42,0.76)" }}>{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 space-y-0.5 list-none pl-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 space-y-0.5 pl-4" style={{ listStyleType: "decimal" }}>{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-1.5 items-start">
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "hsl(193,100%,50%)" }} />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
          em: ({ children }) => <em style={{ color: "rgba(15,23,42,0.67)" }}>{children}</em>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "hsl(193,100%,60%)" }}>{children}</a>,
          blockquote: ({ children }) => (
            <blockquote className="pl-3 py-1 my-2 rounded-r-lg" style={{ borderLeft: "3px solid hsl(193,100%,40%)", background: "rgba(0,198,255,0.06)" }}>
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => {
            if (!src) return null;
            return (
              <div className="my-3">
                <img
                  src={src}
                  alt={alt || "Generated image"}
                  className="rounded-xl max-w-full"
                  style={{ maxHeight: "480px", objectFit: "contain", border: "1px solid rgba(15,23,42,0.1)", background: "#f8fafc" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <a
                    href={src}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ background: "rgba(0,198,255,0.1)", color: "hsl(193,100%,40%)", border: "1px solid rgba(0,198,255,0.2)" }}>
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs"
                    style={{ color: "rgba(15,23,42,0.4)" }}>
                    Open full size ↗
                  </a>
                </div>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg" style={{ border: "1px solid rgba(15,23,42,0.1)" }}>
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: "rgba(0,198,255,0.08)" }}>{children}</thead>,
          th: ({ children }) => <th className="text-left px-2.5 py-1.5 font-semibold" style={{ color: "hsl(193,100%,65%)", borderBottom: "1px solid rgba(15,23,42,0.1)" }}>{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)", color: "rgba(15,23,42,0.8)" }}>{children}</td>,
          hr: () => <hr className="my-3" style={{ borderColor: "rgba(15,23,42,0.1)" }} />,
          code({ node, className, children, ...props }: any) {
            const inline = !className;
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(0,198,255,0.12)", color: "hsl(193,100%,70%)" }} {...props}>
                  {children}
                </code>
              );
            }
            const thisIdx = codeBlockIdx++;
            const codeStr = String(children).replace(/\n$/, "");
            const lang = (className || "").replace("language-", "") || "code";
            return (
              <div className="relative my-2 rounded-xl overflow-hidden" style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.1)" }}>
                <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(15,23,42,0.05)", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                  <span className="text-xs font-mono" style={{ color: "hsl(193,100%,55%)" }}>{lang}</span>
                  <button onClick={() => copyBlock(codeStr, thisIdx)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
                    style={{ background: copiedBlock === thisIdx ? "hsl(155,70%,30%)" : "rgba(15,23,42,0.07)", color: copiedBlock === thisIdx ? "hsl(155,70%,70%)" : "rgba(15,23,42,0.5)" }}>
                    {copiedBlock === thisIdx ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed m-0" style={{ color: "rgba(15,23,42,0.85)" }}>
                  <code>{codeStr}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
      {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm animate-pulse" style={{ background: "hsl(193,100%,50%)", verticalAlign: "middle" }} />}
    </div>
  );
}

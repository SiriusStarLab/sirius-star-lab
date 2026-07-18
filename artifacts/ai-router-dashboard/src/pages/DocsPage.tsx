import { useState } from "react";
import { Copy, Check } from "lucide-react";

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative group">
      <pre className={`bg-[#0c0c10] border border-[#2a2a35] rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto language-${lang}`}>
        <code>{code}</code>
      </pre>
      <button onClick={copy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg p-1.5 text-slate-400">
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function DocsPage() {
  const apiBase = "https://api.sirius-ai.live/v1";
  const demoKey = "sk-sr-YOUR_API_KEY";

  return (
    <div className="p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Documentation</h1>
        <p className="text-slate-400 text-sm">100% OpenAI-compatible. Drop in as a replacement with one URL change.</p>
      </div>

      {/* Quick start */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Quick start</h2>
        <CodeBlock code={`curl ${apiBase}/chat/completions \\
  -H "Authorization: Bearer ${demoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "anthropic/claude-haiku-4-5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'`} />
      </section>

      {/* Python */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Python (OpenAI SDK)</h2>
        <CodeBlock lang="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="${demoKey}",
    base_url="${apiBase}"
)

response = client.chat.completions.create(
    model="anthropic/claude-haiku-4-5",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`} />
      </section>

      {/* Node.js */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Node.js (OpenAI SDK)</h2>
        <CodeBlock lang="javascript" code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${demoKey}",
  baseURL: "${apiBase}"
});

const response = await client.chat.completions.create({
  model: "anthropic/claude-sonnet-4-5",
  messages: [{ role: "user", content: "Hello!" }]
});
console.log(response.choices[0].message.content);`} />
      </section>

      {/* Streaming */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Streaming</h2>
        <CodeBlock code={`curl ${apiBase}/chat/completions \\
  -H "Authorization: Bearer ${demoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Count to 5"}], "stream": true}'`} />
      </section>

      {/* Cache */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Caching</h2>
        <p className="text-slate-400 text-sm mb-3">
          Identical non-streaming requests are cached for 1 hour. The response includes a header indicating the cache status.
        </p>
        <CodeBlock code={`# First request — MISS (charged)
curl -I ${apiBase}/chat/completions ...
# X-Cache: MISS

# Same request again — HIT (free)
curl -I ${apiBase}/chat/completions ...
# X-Cache: HIT`} />
      </section>

      {/* Model aliases */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Model aliases</h2>
        <p className="text-slate-400 text-sm mb-3">
          Define custom model names in the Aliases page. Use them in your code — swap models any time without changing your app.
        </p>
        <CodeBlock code={`# After setting alias "my-fast" → "anthropic/claude-haiku-4-5"
curl ${apiBase}/chat/completions \\
  -H "Authorization: Bearer ${demoKey}" \\
  -d '{"model": "my-fast", "messages": [...]}'
# Automatically resolves to claude-haiku-4-5`} />
      </section>

      {/* Supported models */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Available models</h2>
        <CodeBlock code={`curl ${apiBase}/models \\
  -H "Authorization: Bearer ${demoKey}"`} />
        <div className="mt-4 bg-[#18181f] border border-[#2a2a35] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-[#2a2a35]">
              <th className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider">Model</th>
              <th className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider">Provider</th>
              <th className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider">Input / 1M</th>
              <th className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider">Output / 1M</th>
            </tr></thead>
            <tbody>
              {[
                ["anthropic/claude-opus-4",    "Anthropic", "$15.00", "$75.00"],
                ["anthropic/claude-sonnet-4-5","Anthropic", "$3.00",  "$15.00"],
                ["anthropic/claude-haiku-4-5", "Anthropic", "$0.80",  "$4.00"],
                ["gpt-4o",                     "OpenAI",    "$2.50",  "$10.00"],
                ["gpt-4o-mini",                "OpenAI",    "$0.15",  "$0.60"],
                ["mistralai/mistral-large",    "Mistral",   "$2.00",  "$6.00"],
                ["meta-llama/llama-3.1-70b",   "Meta",      "$0.35",  "$0.40"],
              ].map(([model, provider, input, output]) => (
                <tr key={model} className="border-b border-[#2a2a35]/50">
                  <td className="px-4 py-2.5 font-mono text-indigo-300">{model}</td>
                  <td className="px-4 py-2.5 text-slate-400">{provider}</td>
                  <td className="px-4 py-2.5 text-slate-300">{input}</td>
                  <td className="px-4 py-2.5 text-slate-300">{output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

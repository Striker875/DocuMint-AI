"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase';
import Auth from '@/components/Auth';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const supabase = createClient();

  // 1. Проверка пользователя и загрузка истории
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
      }
    };
    checkUser();
  }, []);

  // Функция для загрузки истории из Supabase
  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6); // Берем последние 6 генераций

    if (!error && data) {
      setHistory(data);
    }
  };

  const handleGenerate = async () => {
    if (!repoUrl) return alert("Введите ссылку на GitHub!");

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();

      if (data.markdown) {
        setResult(data.markdown);

        if (user) {
          // Сохраняем в базу
          const { error } = await supabase
          .from('generations')
          .insert({
            user_id: user.id,
            repo_url: repoUrl,
            markdown: data.markdown
          });

          if (!error) {
            // Сразу обновляем список истории на экране
            fetchHistory(user.id);
          }
        }
      } else {
        alert("Ошибка: " + (data.error || "Не удалось сгенерировать"));
      }
    } catch (err) {
      alert("Произошла ошибка при запросе");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center p-6 pt-12 relative overflow-x-hidden">
    {/* Сетка на фоне */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

    <div className="relative z-10 w-full max-w-4xl">

    {/* АВТОРИЗАЦИЯ */}
    <div className="flex justify-end w-full mb-8">
    <Auth />
    </div>

    <div className="text-center mb-12">
    <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
    DocuMint AI
    </h1>
    <p className="text-slate-400 text-lg font-light">
    {user
      ? `Welcome back, ${user.user_metadata.full_name || user.user_metadata.user_name || 'User'}!`
      : "Professional README.md generation in seconds."}
      </p>
      </div>

      {/* ИСТОРИЯ ГЕНЕРАЦИЙ (показываем только если есть данные) */}
      {user && history.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-2 duration-700">
        <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Recent Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {history.map((item) => (
          <div
          key={item.id}
          onClick={() => {
            setResult(item.markdown);
            setRepoUrl(item.repo_url);
          }}
          className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-lg hover:border-emerald-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group active:scale-95"
          >
          <p className="text-[11px] text-slate-500 group-hover:text-emerald-400 truncate font-mono">
          {item.repo_url.replace("https://github.com/", "")}
          </p>
          </div>
        ))}
        </div>
        </div>
      )}

      {/* ФОРМА ВВОДА */}
      <div className="flex flex-col sm:flex-row gap-3 mb-12 group">
      <input
      type="text"
      value={repoUrl}
      onChange={(e) => setRepoUrl(e.target.value)}
      placeholder="https://github.com/username/repo"
      className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white backdrop-blur-sm placeholder:text-slate-600"
      />
      <button
      onClick={handleGenerate}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 min-w-[160px] flex justify-center items-center"
      >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : "Generate"}
      </button>
      </div>

      {/* РЕЗУЛЬТАТ */}
      {result && (
        <div className="mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Generated Markdown</span>
        <button
        onClick={() => { navigator.clipboard.writeText(result); alert("Copied to clipboard!"); }}
        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-4 rounded-lg border border-slate-700 transition-all active:bg-slate-600"
        >
        Copy Content
        </button>
        </div>

        <div className="p-8">
        <article className="prose prose-invert prose-emerald max-w-none
        prose-headings:font-bold prose-h1:text-3xl
        prose-p:text-slate-300 prose-code:text-emerald-300
        prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-slate-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {result}
        </ReactMarkdown>
        </article>
        </div>
        </div>
      )}
      </div>

      <footer className="mt-20 text-slate-700 text-[10px] font-mono pb-10 tracking-[0.3em] uppercase">
      DocuMint AI &copy; 2026 • VoidMachine Release
      </footer>
      </main>
  );
}

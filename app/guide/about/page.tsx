"use client";

import { motion } from "framer-motion";
import { GitFork, ExternalLink, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

export default function AboutPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
    >
      <div className="max-w-md mx-auto px-4 pt-6 pb-16 space-y-6">

        {/* Back button */}
        <motion.div {...fadeUp(0)}>
          <Link href="/guide" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/30 hover:bg-white/50 transition-colors active:scale-95">
            <ArrowLeft size={16} className="text-white" />
            <span className="text-white font-bold text-sm">使い方に戻る</span>
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.div {...fadeUp(0.05)} className="text-center py-2">
          <div className="text-6xl mb-3 inline-block">👩‍💻</div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">製作者について</h1>
          <p className="text-white/80 text-xs mt-2">Plan-co を作った人</p>
        </motion.div>

        {/* Profile */}
        <motion.div {...fadeUp(0.1)} className="bg-white/90 rounded-3xl p-6 shadow-xl">
          <div className="text-center mb-5">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-lg mb-3"
              style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}>
              🌸
            </div>
            <p className="text-2xl font-extrabold text-gray-800">古澤 美波</p>
            <p className="text-gray-400 text-sm font-bold mt-0.5">フルサワ ミミ</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-2xl">
              <span className="text-xl shrink-0">🎓</span>
              <div>
                <p className="font-bold text-gray-700 text-sm">千葉工業大学大学院</p>
                <p className="text-gray-400 text-xs mt-0.5">情報科学研究科 情報科学専攻・修士１年</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-2xl">
              <span className="text-xl shrink-0">🔬</span>
              <div>
                <p className="font-bold text-gray-700 text-sm">研究テーマ</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  聴覚アプローチを用いた<br />ストレス介入システムの開発
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-2xl">
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="font-bold text-gray-700 text-sm">モットー</p>
                <p className="text-gray-400 text-xs mt-0.5">「人の役に立つ」を軸に、研究・就活中</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Links */}
        <motion.div {...fadeUp(0.2)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔗</span>
            <h2 className="text-base font-extrabold text-gray-800">連絡先 / リンク</h2>
          </div>
          <div className="space-y-3">
            <a
              href="mailto:s2232140mp@chibatech.ac.jp"
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #FFB5A7, #FEC89A)" }}>
                <Mail size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-700 text-sm">メール</p>
                <p className="text-gray-400 text-xs truncate">s2232140mp@chibatech.ac.jp</p>
              </div>
              <ExternalLink size={14} className="text-gray-300 shrink-0" />
            </a>

            <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #5865F2, #7983f5)" }}>
                <span className="text-white text-sm font-extrabold">DC</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-700 text-sm">Discord</p>
                <p className="text-gray-400 text-xs">mimi_333</p>
              </div>
            </div>

            <a
              href="https://github.com/2232140"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                <GitFork size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-700 text-sm">GitHub</p>
                <p className="text-gray-400 text-xs">@2232140</p>
              </div>
              <ExternalLink size={14} className="text-gray-300 shrink-0" />
            </a>
          </div>
        </motion.div>

        {/* Works */}
        <motion.div {...fadeUp(0.25)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🛠️</span>
            <h2 className="text-base font-extrabold text-gray-800">制作物</h2>
          </div>
          <div className="space-y-3">

            <div className="p-4 rounded-2xl border-2 border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎢</span>
                <p className="font-extrabold text-gray-800 text-sm">Plan-co</p>
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-400">このアプリ</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                グループの「どこ行く？」をAIとゲームで楽しく解決するプランニングアプリ。
              </p>
            </div>

            <a
              href="https://prototype-2-nu.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-2xl border-2 border-purple-100 hover:bg-purple-50 transition-colors active:scale-95"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📔</span>
                <p className="font-extrabold text-gray-800 text-sm">こころの日記</p>
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-400">PROTOTYPE</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                自分の状態を可視化した日記アプリ。CHIBATECH PROTOTYPE の課題制作。
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ExternalLink size={11} className="text-gray-300" />
                <p className="text-gray-300 text-xs">prototype-2-nu.vercel.app</p>
              </div>
            </a>

          </div>
        </motion.div>

        {/* Footer */}
        <motion.div {...fadeUp(0.3)} className="text-center pb-4">
          <p className="text-white/70 text-xs font-bold">🎢 Plan-co — 今日の遊び、一緒に決めよう！</p>
        </motion.div>

      </div>
    </main>
  );
}

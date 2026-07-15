"use client";

import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl">{emoji}</span>
      <h2 className="text-lg font-extrabold text-gray-800">{title}</h2>
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, #FFB5A7, #FEC89A)" }}>
        {num}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-400">{text}</span>
  );
}

export default function GuidePage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
    >
      <div className="max-w-md mx-auto px-4 pt-10 pb-16 space-y-6">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center py-4">
          <div className="text-6xl mb-3 inline-block animate-bounce">🎢</div>
          <h1 className="text-4xl font-extrabold text-white drop-shadow-lg">Plan-co</h1>
          <p className="text-white/90 font-bold text-sm mt-2 tracking-widest">今日の遊び、一緒に決めよう！</p>
          <p className="text-white/80 text-xs mt-3 leading-relaxed">
            「どこ行く？」を楽しく解決するアプリ。<br />
            AIとゲームで、行き先をみんなで決めよう！
          </p>
        </motion.div>

        {/* Overview */}
        <motion.div {...fadeUp(0.1)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="📱" title="2つのモード" />
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "linear-gradient(135deg, #fff7ed, #fff0f0)" }}>
              <span className="text-3xl">🙋</span>
              <div>
                <p className="font-extrabold text-gray-800">一人で使う</p>
                <p className="text-gray-400 text-xs mt-0.5">AI提案・チャット・1日プラン・ルーレット</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "linear-gradient(135deg, #f0f9ff, #f0f0ff)" }}>
              <span className="text-3xl">👥</span>
              <div>
                <p className="font-extrabold text-gray-800">みんなで使う</p>
                <p className="text-gray-400 text-xs mt-0.5">投票・AI提案・フリフリゲーム・ルーレット</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Solo mode */}
        <motion.div {...fadeUp(0.15)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="🙋" title="一人で使う" />
          <div className="space-y-4">

            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge text="📍 スポット提案" />
              </div>
              <div className="space-y-2 pl-1">
                <Step num={1} text="エリア・人数・予算・テーマを入力" />
                <Step num={2} text="AIが5つのスポットを提案" />
                <Step num={3} text="ルーレットで行き先を決定！" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge text="💬 AIチャット" />
              </div>
              <div className="space-y-2 pl-1">
                <Step num={1} text="「ぷらんちゃん」に気分や希望を話しかける" />
                <Step num={2} text="会話しながらスポット or 1日プランを決めてもらう" />
                <Step num={3} text="提案が出たらルーレットへ！" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge text="📅 1日プラン" />
              </div>
              <div className="space-y-2 pl-1">
                <Step num={1} text="エリア・出発時間・予算などを入力" />
                <Step num={2} text="朝・昼・夜の3スロットプランをAIが提案" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge text="🎡 カスタムルーレット" />
              </div>
              <div className="space-y-2 pl-1">
                <Step num={1} text="行き先を自由に入力（最大5件）" />
                <Step num={2} text="スマホを振ってパワーをチャージ" />
                <Step num={3} text="ルーレットを回して決定！" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Group mode */}
        <motion.div {...fadeUp(0.2)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="👥" title="みんなで使う" />
          <div className="space-y-2 pl-1">
            <Step num={1} text="ホストがルームを作成し、招待リンクをシェア" />
            <Step num={2} text="メンバーが参加（ニックネームを設定）" />
            <Step num={3} text="テーマ・エリア・予算タグをみんなで投票" />
            <Step num={4} text="ホストが「AI提案を生成」ボタンを押す" />
            <Step num={5} text="気に入ったスポットに❤️いいね！" />
            <Step num={6} text="フリフリゲームでルーレットを盛り上げよう" />
            <Step num={7} text="ルーレットで行き先を決定！" />
          </div>
          <div className="mt-4 p-3 bg-orange-50 rounded-2xl">
            <p className="text-orange-400 text-xs font-bold">💡 ルームは繰り返し使える！</p>
            <p className="text-gray-500 text-xs mt-1">同じルームに何度でも入り直してOK。毎回ゼロから作り直す必要なし。</p>
          </div>
        </motion.div>

        {/* Furi Furi game */}
        <motion.div {...fadeUp(0.25)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="📳" title="フリフリゲーム" />
          <p className="text-gray-500 text-xs mb-4">ルーレットの前に全員でスマホを振る盛り上げゲーム！</p>

          <div className="space-y-4">
            <div className="p-3 rounded-2xl border-2 border-orange-100">
              <p className="font-extrabold text-gray-800 text-sm mb-2">🤝 協力モード（シンクロ）</p>
              <div className="space-y-1.5">
                <Step num={1} text="10秒間、みんなで一緒にスマホを振る" />
                <Step num={2} text="合計フリフリ数でシンクロ率が決まる" />
                <Step num={3} text="80%以上でトラップ（？？？）が消滅！ラッキー枠ゲット🎉" />
              </div>
            </div>

            <div className="p-3 rounded-2xl border-2 border-red-100">
              <p className="font-extrabold text-gray-800 text-sm mb-2">⚔️ バトルモード</p>
              <div className="space-y-1.5">
                <Step num={1} text="10秒間、誰が一番多く振れるか競う" />
                <Step num={2} text="勝者のいいねスポットがルーレットで2倍の確率に！" />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-2xl">
            <p className="text-blue-400 text-xs font-bold">📱 端末を振る or タップで代用OK！</p>
            <p className="text-gray-500 text-xs mt-1">iOSはセンサー許可が必要な場合があります。</p>
          </div>
        </motion.div>

        {/* Roulette charge */}
        <motion.div {...fadeUp(0.3)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="🎡" title="ルーレット" />
          <div className="space-y-2 pl-1">
            <Step num={1} text="フリフリパワーをみんなで80まで貯める（振る or タップ）" />
            <Step num={2} text="パワーMAX！ホストが「回す！」ボタンを押す" />
            <Step num={3} text="ルーレットが回転し、行き先が決定！" />
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-2xl">
            <p className="text-yellow-500 text-xs font-bold">✨ ？？？（トラップ）について</p>
            <p className="text-gray-500 text-xs mt-1">ぷらんこ神がランダムにスポットを選ぶ枠。協力モードで80%達成すると消える！</p>
          </div>
        </motion.div>

        {/* Tags guide */}
        <motion.div {...fadeUp(0.35)} className="bg-white/90 rounded-3xl p-5 shadow-xl">
          <SectionTitle emoji="🏷️" title="投票タグ一覧" />
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-400 mb-1.5">アクティビティ</p>
              <div className="flex flex-wrap gap-1.5">
                {["🍜 食べたい", "☕ カフェ", "🏠 屋内", "🌞 屋外", "🏃 アクティブ", "😴 まったり", "📸 映え", "🎭 エンタメ"].map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-400">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 mb-1.5">エリア</p>
              <div className="flex flex-wrap gap-1.5">
                {["🏙️ 都市部", "🌿 自然・公園", "🚉 駅近", "🌄 郊外"].map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-400">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 mb-1.5">予算（1人あたり）</p>
              <div className="flex flex-wrap gap-1.5">
                {["🪙 〜1000円", "💴 〜3000円", "💰 〜5000円", "💎 上限なし"].map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-500">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div {...fadeUp(0.4)} className="text-center pb-4">
          <p className="text-white/70 text-xs font-bold">🎢 Plan-co — 今日の遊び、一緒に決めよう！</p>
        </motion.div>

      </div>
    </main>
  );
}

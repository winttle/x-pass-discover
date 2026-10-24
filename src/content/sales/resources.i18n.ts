import {
  BITE_PROTEIN_DRINK,
  BITE_SALES_GUARDRAILS,
  BITE_UNIT_ECONOMICS,
} from '@/content/company';
import type { ResourceText, Translations } from '@/content/localize';

/**
 * The Sales Data Room in other languages, by resource key. Figures are read
 * from the same constants as `resources.ts`. See `localize.ts`.
 */

const g = BITE_SALES_GUARDRAILS;
const e = BITE_UNIT_ECONOMICS;
const p = BITE_PROTEIN_DRINK.attributes;

export const SALES_RESOURCE_TRANSLATIONS: Translations<Record<string, ResourceText>> = {
  ja: {
    'sales-training-1pager': {
      fileDetail: 'ガイド・5分で読めます',
      title: '営業スターターガイド：プロの考え方',
      description: '役割の心構え、重要な概念、フレームワーク。シナリオを始める前に読んでください。',
      markdown: `## 役割の心構え

> **営業とは、製品を押し売りすることではありません。顧客のビジネスを理解し、双方に価値を生む取引を設計することです。**

こう考える前に：

> どうすれば自社の製品を売れるか？

こう問いかけます：

> **顧客は何を実現しようとしているのか？**

## 重要な概念

| 概念 | 意味 |
|---|---|
| 取引先仮説（Account Hypothesis） | 商談前に立てる、顧客の目標・課題・リスクについての暫定的な見立て |
| ビジネス目標（Business Goal） | 顧客が最終的に実現したい成果 |
| ニーズ（Need） | 顧客が課題を解決するために必要なもの |
| 制約（Constraint） | 予算、棚スペース、生産能力など、変えにくい条件 |
| 判断基準（Decision Criteria） | バイヤーが判断に使う要素 |
| 価値提案（Value Proposition） | 製品の機能が、この顧客にとってどんな価値になるか |
| ユニットエコノミクス（Unit Economics） | 1個あたりの売上・コスト・利益の構造 |
| ガードレール（Guardrail） | 越えてはいけない最低・最高の条件 |
| トレードオフ（Trade-off） | ある分野で譲る代わりに、別の分野で価値を得ること |
| パイロット（Pilot） | 拡大前の限定的なテスト |
| 成功基準（Success Criteria） | 拡大や継続を判断するための根拠のしきい値 |

## 大切な考え方

1. **売り込む前に理解する。**
2. **仮説は事実ではない。**
3. **口にされた要望 ≠ 本当のニーズ。**
4. **特徴 ≠ 価値。**
5. **価格だけで交渉しない。**
6. **成約した取引が、いつも良い取引とは限らない。**

## フレームワーク

**ディスカバリー**

\`\`\`
質問する → 聴く → 掘り下げる → 確認する → 適応する
\`\`\`

**価値の創出**

\`\`\`
特徴 → 顧客にとっての便益 → ビジネスへの影響 → 根拠
\`\`\`

**交渉**

\`\`\`
優先順位 → ガードレール → トレードオフ → 合意
\`\`\`

## 核となる一言

> **要望の裏にある「なぜ」を聞く。**

バイヤーに「価格が高すぎる」と言われたら、本当の問題が利益率なのか、売れ残りのリスクなのか、廃棄なのか、競合の価格なのか、社内承認なのかを探ってください。`,
    },

    'bite-company-profile': {
      fileDetail: 'PDF・4ページ',
      title: 'BITE 会社概要',
      description: 'BITE とはどんな会社か、流通営業チームはどう動いているか。',
      markdown: `**BITE** は、店舗、テイクアウト、デリバリー、デジタルチャネルを展開するカジュアルな F&B ブランドです。

**流通営業**チームは、BITE のパッケージ商品をコンビニ、スーパー、ドラッグストアなどの小売チャネルに販売します。全国チェーンでの採用は*カテゴリーバイヤー*が決めます。バイヤーが責任を負うのは、特定のサプライヤーではなく、棚のカテゴリー全体の売上と収益性です。

バイヤーの棚には限りがあります。新しい商品を加えるには、たいてい別の商品を外すことになります。それが本当の競争です。

### 流通営業チームが評価されること

- どんな価格でもよいのではなく、採算の取れる条件で採用を勝ち取ること
- 発売後の売れ行き。棚から外された商品は、失注した提案よりも高くつくため
- BITE 社内のガードレールに対する、1本あたりの貢献利益
- 取引先との長期的な関係`,
    },

    'bite-protein-drink-sheet': {
      fileDetail: 'PDF・2ページ',
      imageAlt: 'BITE Protein Drink のチョコレート、バニラビーン、ストロベリー、抹茶',
      title: 'BITE Protein Drink — 製品シート',
      description: '仕様、価格、強みと弱み。',
      markdown: `| 項目 | 内容 |
|---|---|
| 製品 | ${BITE_PROTEIN_DRINK.name} |
| 容量 | ${p.size} |
| たんぱく質 | ${p.protein} |
| カロリー | ${p.calories} |
| 保存方法 | 要冷蔵 |
| 賞味期限 | ${p.shelfLifeDays} 日 |
| フレーバー | ミルクコーヒー / ココア |
| 希望小売価格 | ¥${p.recommendedRetailPriceYen} |
| QuickMart 向け標準卸価格 | ¥${p.standardWholesalePriceYen} |
| 入数 | ${p.packSize} |
| 主なターゲット | 朝食を抜きがちな、忙しい20〜30代 |

### 強み

- たんぱく質 20 g
- 手軽な食事・朝食の代わりになる
- なめらかで飲みやすい味

### 弱み

- 冷蔵の棚スペースが必要
- 常温品より賞味期限が短い
- 小売価格が ¥300 に近い
- 日本でのブランド認知度が低い
- 初期の生産能力が限られている`,
    },

    'bite-unit-economics': {
      fileDetail: 'Excel・1シート',
      title: 'BITE Protein Drink — ユニットエコノミクス',
      description: '1本あたりのコスト構造と基本貢献利益。',
      columns: ['項目', '1本あたり'],
      rows: [
        ['希望小売価格', `¥${e.recommendedRetailPriceYen}`],
        ['標準卸価格', `¥${e.standardWholesalePriceYen}`],
        ['製造原価', `¥${e.manufacturingCostYen}`],
        ['冷蔵物流費', `¥${e.coldLogisticsYen}`],
        ['基本販促費', `¥${e.basePromotionYen}`],
        ['BITE の基本貢献利益', `¥${e.baseContributionYen}`],
      ],
      note: `基本貢献利益：${e.standardWholesalePriceYen} − ${e.manufacturingCostYen} − ${e.coldLogisticsYen} − ${e.basePromotionYen} = ${e.baseContributionYen}。追加で販促を提供すると、その分さらに貢献利益が減ります。決してタダではありません。`,
    },

    'bite-sales-guardrails': {
      fileDetail: '社内規程・1ページ',
      title: 'BITE 社内営業ガードレール',
      description:
        'BITE の社内規程です。バイヤーはこの下限を知りません。QuickMart 側の制約であるかのように提示しないでください。',
      markdown: `これは **BITE 社内の限度**です。QuickMart には伝えていません。

- 最低卸価格：**¥${g.minWholesalePriceYen}**
- 価格構造から得る1本あたりの最低貢献利益：**¥${g.minUnitContributionYen}**（決められた基本構造を超える追加販促の前）
- 追加の販促支援：**最大 ¥${g.maxExtraPromotionYen}/本**
- **全量返品保証はしない**
- 支払条件：最長 **${g.maxPaymentTermDays} 日**
- 最小生産ロット：**${g.minProductionRunUnits.toLocaleString()} 本**
- 損益分岐点を下回る取引は受けない

販促支援を加える場合は、その影響を明示的に計算してください。その分は貢献利益から出ていきます。`,
    },

    'quickmart-account-profile': {
      fileDetail: 'PDF・12ページ',
      imageAlt: '夕暮れの QuickMart の店舗',
      title: 'QuickMart — 取引先プロフィール',
      description: 'チェーンの概要、現在の課題、カテゴリーの方向性。',
      markdown: `QuickMart は日本のコンビニエンスストアチェーンです。

| 項目 | 内容 |
|---|---|
| 店舗数 | 全国に約 1,200 店 |
| 顧客の傾向 | 18〜29歳の来店が増えている |
| 現在の課題 | 朝 7:00〜10:00 の売上が伸び悩んでいる |
| カテゴリーの方向性 | 健康飲料を拡充したい |
| 物理的な制約 | 冷蔵の棚スペースが限られている |

### 公表されているビジネス目標

- 朝の飲料売上を **15%** 伸ばす
- 健康飲料カテゴリーを拡充する
- 新商品の廃棄率を **5% 以下**に抑える
- 20代のオフィスワーカーを取り込む
- 差別化された商品を導入する

### 分かっている判断基準

- 目標の小売価格は **¥300 以下**
- 小売利益率の目標：**35% 以上**
- 全店展開の前に、限定店舗でのパイロットを好む
- 売れ行きが悪ければ 4 週間で取り扱いを終了することがある
- 成功すれば、最大 **1,200 店**まで展開を広げられる`,
    },

    'quickmart-category-data': {
      fileDetail: 'Excel・3.2 MB',
      title: 'QuickMart — 公開カテゴリーデータ',
      description:
        '商談前に入手できるカテゴリーレベルの指標です。バイヤーはこれよりも具体的な数字を知っています。',
      columns: ['指標', '値'],
      rows: [
        ['18〜29歳の顧客構成比', '31%'],
        ['朝の売上構成比', '18%'],
        ['健康飲料カテゴリーの成長率', '前年比 +15%'],
        ['リピート購入率', '28%'],
        ['朝のプロテインドリンク平均販売数', '2.4 本/店/日'],
        ['冷蔵飲料の廃棄率', '4.2%'],
        ['顧客の支払意思額', '¥250〜300'],
      ],
      note: 'これはカテゴリーの平均値です。QuickMart の中でどう内訳が分かれるかはバイヤーが教えてくれます。ただし、正しいことについて質問した場合に限ります。',
    },

    'competitor-comparison': {
      fileDetail: 'Excel・1.1 MB',
      title: '競合比較',
      description: '同じ棚を争っているプロテインドリンク。',
      columns: ['製品', '容量 / たんぱく質', '小売価格', '卸価格', 'ポジショニング', '弱み'],
      rows: [
        ['FitDrink', '300 ml / 15 g', '¥278', '¥158', '低価格 / 認知度', 'たんぱく質が少ない'],
        ['BodyGo', '350 ml / 20 g', '¥328', '¥198', 'プレミアム', '高い'],
        ['Morning Plus', '250 ml / 10 g', '¥248', '¥145', '朝向け / 安定', '差別化が弱い'],
        ['BITE Protein Drink', '330 ml / 20 g', '¥298', '¥178', '食事代わり / 味', '認知度が低い'],
      ],
    },

    'pilot-structure-options': {
      fileDetail: 'メモ・1ページ',
      title: 'パイロット構成の選択肢（判断材料）',
      description: '3つの出発点です。どれも正解ではありません。自分で設計しても構いません。',
      markdown: `これは**判断材料であって、正解ではありません**。BITE のガードレールを守る限り、別の構成を設計しても構いません。

### A. 関西 — 120 店舗
- 集中している
- 運営を管理しやすい
- サンプルが小さい

### B. 全国 — 300 店舗
- より広い市場データが得られる
- 認知が早く広がる
- 生産と廃棄のリスクが大きく、運営も複雑になる

### C. オフィス街 — 80 店舗
- ターゲットとの相性が良い
- 朝・朝食の仮説が明確
- 結果を一般化しにくい`,
    },
  },
};
